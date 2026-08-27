'use strict';

/**
 * SSE helper for long-running bulk POSTs.
 * Proxy/ingress notes: see README "Long-running bulk actions (SSE)".
 */

const HEARTBEAT_MS = 15000;
const PROGRESS_THROTTLE_MS = 250;

const opLocks = new Set();

function getAccept(ctx) {
    const headers = (ctx && ctx.request && ctx.request.headers) || {};
    return String(headers.accept || headers.Accept || '');
}

function wantsSse(ctx) {
    return /\btext\/event-stream\b/i.test(getAccept(ctx));
}

function isCancelled(opts) {
    return !!(opts && opts.signal && opts.signal.cancelled);
}

function reportProgress(opts, payload) {
    if (opts && typeof opts.onProgress === 'function' && !isCancelled(opts)) {
        opts.onProgress(payload);
    }
}

function startSse(ctx) {
    ctx.respond = false;
    ctx.status = 200;
    ctx.set('Content-Type', 'text/event-stream');
    ctx.set('Cache-Control', 'no-cache');
    ctx.set('Connection', 'keep-alive');
    ctx.set('X-Accel-Buffering', 'no');
    if (ctx.res && typeof ctx.res.flushHeaders === 'function') {
        ctx.res.flushHeaders();
    }

    const signal = { cancelled: false };
    let lastProgressAt = 0;
    let heartbeat = null;

    const write = (chunk) => {
        if (signal.cancelled || !ctx.res || ctx.res.writableEnded) {
            return;
        }
        ctx.res.write(chunk);
    };

    const send = (event, data) => {
        write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const sendProgress = (payload) => {
        const now = Date.now();
        const isFinal = payload
            && typeof payload.done === 'number'
            && typeof payload.total === 'number'
            && payload.total > 0
            && payload.done >= payload.total;
        if (!isFinal && lastProgressAt && now - lastProgressAt < PROGRESS_THROTTLE_MS) {
            return;
        }
        lastProgressAt = now;
        send('progress', payload);
    };

    heartbeat = setInterval(() => {
        write(': ping\n\n');
    }, HEARTBEAT_MS);
    if (heartbeat && typeof heartbeat.unref === 'function') {
        heartbeat.unref();
    }

    const cleanup = () => {
        if (heartbeat) {
            clearInterval(heartbeat);
            heartbeat = null;
        }
    };

    const onClose = () => {
        signal.cancelled = true;
        cleanup();
    };

    if (ctx.req && typeof ctx.req.on === 'function') {
        ctx.req.on('close', onClose);
    }

    const end = () => {
        cleanup();
        if (ctx.req && typeof ctx.req.removeListener === 'function') {
            ctx.req.removeListener('close', onClose);
        }
        if (ctx.res && !ctx.res.writableEnded && typeof ctx.res.end === 'function') {
            ctx.res.end();
        }
    };

    return { send, sendProgress, signal, end };
}

function clearOpLocks() {
    opLocks.clear();
}

async function runBulk(ctx, lockKey, work) {
    if (!wantsSse(ctx)) {
        await work({});
        ctx.send({});
        return;
    }

    if (lockKey && opLocks.has(lockKey)) {
        const sse = startSse(ctx);
        sse.send('error', { message: 'Operation already running' });
        sse.end();
        return;
    }

    if (lockKey) {
        opLocks.add(lockKey);
    }

    const sse = startSse(ctx);
    try {
        const result = await work({
            onProgress: sse.sendProgress,
            signal: sse.signal,
        });
        if (!sse.signal.cancelled) {
            sse.send('result', result || {});
        }
    } catch (err) {
        if (!sse.signal.cancelled) {
            sse.send('error', { message: (err && err.message) || 'Unexpected error' });
        }
    } finally {
        if (lockKey) {
            opLocks.delete(lockKey);
        }
        sse.end();
    }
}

module.exports = {
    HEARTBEAT_MS,
    PROGRESS_THROTTLE_MS,
    wantsSse,
    startSse,
    runBulk,
    isCancelled,
    reportProgress,
    clearOpLocks,
};
