'use strict';

jest.mock('@dasmeta/event-manager-utils', () => ({
    logger: {
        isDebug: jest.fn(() => false),
        debug: jest.fn(),
    },
}));

jest.mock('../../helper/dbAdapter/dbClientFactory', () => ({
    dbClientFactory: {
        createClient: jest.fn(),
    },
}));

describe('populateMissing', () => {
    let service;
    let mockStore;
    let create;

    beforeEach(() => {
        jest.resetModules();

        mockStore = {
            getMissingEvents: jest.fn(),
            getExistingEvents: jest.fn(),
        };

        const { dbClientFactory } = require('../../helper/dbAdapter/dbClientFactory');
        dbClientFactory.createClient.mockReturnValue(mockStore);

        create = jest.fn().mockResolvedValue({});
        strapi.query = jest.fn(() => ({ create }));

        service = require('../../api/event-subscription/services/event-subscription');
    });

    it('inserts without opts and returns counts', async () => {
        mockStore.getMissingEvents.mockResolvedValue([{ id: '1' }, { id: '2' }]);
        mockStore.getExistingEvents.mockResolvedValue([{ id: '1' }, { id: '2' }]);

        const result = await service.populateMissing('topic', 'sub', 'fail');

        expect(result).toEqual({ insertCount: 2, eventCount: 2 });
        expect(create).toHaveBeenCalledTimes(2);
    });

    it('reports progress for each insert', async () => {
        mockStore.getMissingEvents.mockResolvedValue([{ id: '1' }, { id: '2' }]);
        mockStore.getExistingEvents.mockResolvedValue([{ id: '1' }, { id: '2' }]);
        const onProgress = jest.fn();

        await service.populateMissing('topic', 'sub', 'fail', { onProgress });

        expect(onProgress.mock.calls.map((call) => call[0])).toEqual([
            { done: 1, total: 2 },
            { done: 2, total: 2 },
        ]);
    });

    it('stops inserting when cancelled', async () => {
        mockStore.getMissingEvents.mockResolvedValue([{ id: '1' }, { id: '2' }]);
        mockStore.getExistingEvents.mockResolvedValue([{ id: '1' }, { id: '2' }]);
        const signal = { cancelled: false };
        create.mockImplementation(async () => {
            signal.cancelled = true;
        });

        const result = await service.populateMissing('topic', 'sub', 'fail', { signal });

        expect(create).toHaveBeenCalledTimes(1);
        expect(result.insertCount).toBe(1);
    });
});
