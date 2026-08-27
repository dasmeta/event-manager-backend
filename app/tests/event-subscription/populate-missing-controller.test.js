'use strict';

const { clearOpLocks } = require('../../helper/sse');

function createCtx(headers = {}, body = {}) {
    const listeners = {};
    const ctx = {
        respond: true,
        status: 0,
        headersSet: {},
        set(key, value) {
            ctx.headersSet[key] = value;
        },
        request: { headers, body },
        req: {
            on(event, fn) {
                listeners[event] = listeners[event] || [];
                listeners[event].push(fn);
            },
            removeListener(event, fn) {
                listeners[event] = (listeners[event] || []).filter((item) => item !== fn);
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

describe('populateMissing controller', () => {
    let controller;
    let populateMissing;

    beforeEach(() => {
        jest.resetModules();
        clearOpLocks();
        populateMissing = jest.fn().mockResolvedValue({ insertCount: 2 });
        global.strapi.services = {
            'event-subscription': { populateMissing },
        };
        controller = require('../../api/event-subscription/controllers/event-subscription');
    });

    afterEach(() => {
        clearOpLocks();
    });

    it('uses JSON send when Accept is not SSE', async () => {
        const ctx = createCtx({ accept: 'application/json' }, { topic: 't', subscription: 's', as: 'fail' });

        await controller.populateMissing(ctx);

        expect(populateMissing).toHaveBeenCalledWith('t', 's', 'fail', {});
        expect(ctx.send).toHaveBeenCalledWith({});
        expect(ctx.res.write).not.toHaveBeenCalled();
    });

    it('streams result when Accept is SSE', async () => {
        const ctx = createCtx({ accept: 'text/event-stream' }, { topic: 't', subscription: 's', as: 'error' });

        await controller.populateMissing(ctx);

        expect(populateMissing).toHaveBeenCalledWith(
            't',
            's',
            'error',
            expect.objectContaining({ onProgress: expect.any(Function), signal: expect.any(Object) })
        );
        const output = ctx.res.write.mock.calls.map((call) => call[0]).join('');
        expect(output).toContain('event: result\ndata: {"insertCount":2}\n\n');
        expect(ctx.res.end).toHaveBeenCalled();
        expect(ctx.send).not.toHaveBeenCalled();
    });

    it('streams error when the service throws', async () => {
        populateMissing.mockRejectedValue(new Error('db down'));
        const ctx = createCtx({ accept: 'text/event-stream' }, { topic: 't', subscription: 's' });

        await controller.populateMissing(ctx);

        const output = ctx.res.write.mock.calls.map((call) => call[0]).join('');
        expect(output).toContain('event: error\ndata: {"message":"db down"}\n\n');
        expect(ctx.res.end).toHaveBeenCalled();
    });
});

describe('other bulk handlers use runBulk', () => {
    let controller;

    beforeEach(() => {
        jest.resetModules();
        clearOpLocks();
        global.strapi.services = {
            'event-subscription': {
                cleanAnomaly: jest.fn().mockResolvedValue({}),
                markMissingAsError: jest.fn().mockResolvedValue({ insertCount: 0 }),
                markAsFail: jest.fn().mockResolvedValue(),
                markAsSuccess: jest.fn().mockResolvedValue(),
                markSingleAsSuccess: jest.fn().mockResolvedValue(),
            },
            'event-stats': {
                calculateSingle: jest.fn().mockResolvedValue({}),
            },
        };
        controller = require('../../api/event-subscription/controllers/event-subscription');
    });

    afterEach(() => {
        clearOpLocks();
    });

    it.each([
        ['cleanAnomaly', { topic: 't', subscription: 's' }],
        ['markMissingAsError', { topic: 't', subscription: 's' }],
        ['markAsFail', { topic: 't', subscription: 's', start: '2020-01-01', end: '2020-01-02' }],
        ['markAsSuccess', { topic: 't', subscription: 's', type: 'fail' }],
        ['markSingleAsSuccess', { topic: 't', subscription: 's', events: ['1'], message: 'x' }],
    ])('%s sends JSON without SSE Accept', async (action, body) => {
        const ctx = createCtx({}, body);
        await controller[action](ctx);
        expect(ctx.send).toHaveBeenCalledWith({});
    });
});
