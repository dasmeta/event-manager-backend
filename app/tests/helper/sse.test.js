'use strict';

const {
    HEARTBEAT_MS,
    wantsSse,
    startSse,
    runBulk,
    clearOpLocks,
} = require('../../helper/sse');

function createCtx(headers = {}) {
    const listeners = {};
    const ctx = {
        respond: true,
        status: 0,
        headersSet: {},
        set(key, value) {
            ctx.headersSet[key] = value;
        },
        request: { headers },
        req: {
            on(event, fn) {
                listeners[event] = listeners[event] || [];
                listeners[event].push(fn);
            },
            removeListener(event, fn) {
                listeners[event] = (listeners[event] || []).filter((item) => item !== fn);
            },
            emit(event) {
                (listeners[event] || []).forEach((fn) => fn());
            },
        },
        res: {
            writableEnded: false,
            flushHeaders: jest.fn(),
            write: jest.fn(),
            end: jest.fn(() => {
                ctx.res.writableEnded = true;
            }),
        },
        send: jest.fn(),
    };
    return ctx;
}

function written(ctx) {
    return ctx.res.write.mock.calls.map((call) => call[0]).join('');
}

describe('wantsSse', () => {
    it('is true for text/event-stream', () => {
        expect(wantsSse(createCtx({ accept: 'text/event-stream' }))).toBe(true);
    });

    it('is true when mixed with other types', () => {
        expect(wantsSse(createCtx({ accept: 'application/json, text/event-stream' }))).toBe(true);
    });

    it('is false when missing', () => {
        expect(wantsSse(createCtx({}))).toBe(false);
    });

    it('is false for application/json', () => {
        expect(wantsSse(createCtx({ accept: 'application/json' }))).toBe(false);
    });

    it('is false for axios-style */* without event-stream', () => {
        expect(wantsSse(createCtx({ accept: 'application/json, text/plain, */*' }))).toBe(false);
    });
});

describe('startSse', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('sets SSE headers and disables Koa respond', () => {
        const ctx = createCtx();
        const sse = startSse(ctx);

        expect(ctx.respond).toBe(false);
        expect(ctx.status).toBe(200);
        expect(ctx.headersSet['Content-Type']).toBe('text/event-stream');
        expect(ctx.headersSet['Cache-Control']).toBe('no-cache');
        expect(ctx.headersSet.Connection).toBe('keep-alive');
        expect(ctx.headersSet['X-Accel-Buffering']).toBe('no');
        expect(ctx.res.flushHeaders).toHaveBeenCalled();
        sse.end();
    });

    it('writes progress/result/error frames', () => {
        const ctx = createCtx();
        const sse = startSse(ctx);

        sse.send('progress', { done: 1, total: 2 });
        sse.send('result', { ok: true });
        sse.send('error', { message: 'nope' });

        expect(written(ctx)).toContain('event: progress\ndata: {"done":1,"total":2}\n\n');
        expect(written(ctx)).toContain('event: result\ndata: {"ok":true}\n\n');
        expect(written(ctx)).toContain('event: error\ndata: {"message":"nope"}\n\n');
        sse.end();
    });

    it('writes heartbeat pings on the interval', () => {
        jest.useFakeTimers();
        const ctx = createCtx();
        const sse = startSse(ctx);

        jest.advanceTimersByTime(HEARTBEAT_MS);
        expect(written(ctx)).toContain(': ping\n\n');
        sse.end();
    });

    it('throttles progress writes in the same tick', () => {
        const ctx = createCtx();
        const sse = startSse(ctx);

        for (let i = 0; i < 10; i++) {
            sse.sendProgress({ done: i, total: 10 });
        }

        const progressFrames = written(ctx).match(/event: progress/g) || [];
        expect(progressFrames).toHaveLength(1);
        sse.end();
    });

    it('still writes the final progress frame when throttled', () => {
        const ctx = createCtx();
        const sse = startSse(ctx);

        sse.sendProgress({ done: 230, total: 273 });
        sse.sendProgress({ done: 273, total: 273 });

        expect(written(ctx)).toContain('event: progress\ndata: {"done":230,"total":273}\n\n');
        expect(written(ctx)).toContain('event: progress\ndata: {"done":273,"total":273}\n\n');
        sse.end();
    });

    it('sets cancelled on req close and clears heartbeat', () => {
        jest.useFakeTimers();
        const ctx = createCtx();
        const sse = startSse(ctx);

        ctx.req.emit('close');
        expect(sse.signal.cancelled).toBe(true);

        ctx.res.write.mockClear();
        jest.advanceTimersByTime(HEARTBEAT_MS);
        expect(ctx.res.write).not.toHaveBeenCalled();
    });

    it('end() ends the response and clears heartbeat without close', () => {
        jest.useFakeTimers();
        const ctx = createCtx();
        const sse = startSse(ctx);

        sse.end();
        expect(ctx.res.end).toHaveBeenCalled();

        ctx.res.write.mockClear();
        jest.advanceTimersByTime(HEARTBEAT_MS);
        expect(ctx.res.write).not.toHaveBeenCalled();
    });
});

describe('runBulk', () => {
    afterEach(() => {
        clearOpLocks();
    });

    it('sends JSON when Accept is not SSE', async () => {
        const ctx = createCtx({ accept: 'application/json' });
        const work = jest.fn().mockResolvedValue({ insertCount: 3 });

        await runBulk(ctx, 'op:a', work);

        expect(work).toHaveBeenCalledWith({});
        expect(ctx.send).toHaveBeenCalledWith({});
        expect(ctx.res.write).not.toHaveBeenCalled();
    });

    it('streams result for SSE Accept', async () => {
        const ctx = createCtx({ accept: 'text/event-stream' });
        const work = jest.fn().mockImplementation(async (opts) => {
            opts.onProgress({ done: 1, total: 1 });
            return { insertCount: 1 };
        });

        await runBulk(ctx, 'op:b', work);

        expect(work).toHaveBeenCalledWith(expect.objectContaining({
            onProgress: expect.any(Function),
            signal: expect.objectContaining({ cancelled: false }),
        }));
        expect(written(ctx)).toContain('event: result\ndata: {"insertCount":1}\n\n');
        expect(ctx.send).not.toHaveBeenCalled();
        expect(ctx.res.end).toHaveBeenCalled();
    });

    it('streams error when work throws', async () => {
        const ctx = createCtx({ accept: 'text/event-stream' });
        const work = jest.fn().mockRejectedValue(new Error('boom'));

        await runBulk(ctx, 'op:c', work);

        expect(written(ctx)).toContain('event: error\ndata: {"message":"boom"}\n\n');
        expect(ctx.res.end).toHaveBeenCalled();
    });

    it('rejects a second concurrent SSE with the same lock key', async () => {
        const first = createCtx({ accept: 'text/event-stream' });
        let release;
        const started = new Promise((resolve) => {
            release = resolve;
        });

        const firstRun = runBulk(first, 'op:lock', async () => {
            await started;
            return {};
        });

        await Promise.resolve();

        const second = createCtx({ accept: 'text/event-stream' });
        await runBulk(second, 'op:lock', jest.fn());

        expect(written(second)).toContain('event: error\ndata: {"message":"Operation already running"}\n\n');

        release();
        await firstRun;
    });
});
