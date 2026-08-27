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

describe('markMissingAsError', () => {
    let service;
    let mockStore;
    let count;

    beforeEach(() => {
        jest.resetModules();

        mockStore = {
            getEventsByTopic: jest.fn(),
            getEventsWithSubscription: jest.fn(),
            createOrUpdateSubscription: jest.fn().mockResolvedValue({}),
        };

        const { dbClientFactory } = require('../../helper/dbAdapter/dbClientFactory');
        dbClientFactory.createClient.mockReturnValue(mockStore);

        count = jest.fn().mockResolvedValue(2);
        strapi.query = jest.fn(() => ({ count }));

        service = require('../../api/event-subscription/services/event-subscription');
    });

    it('reports progress with the topic event count as total', async () => {
        mockStore.getEventsByTopic
            .mockResolvedValueOnce([{ id: '1' }, { id: '2' }])
            .mockResolvedValueOnce([]);
        mockStore.getEventsWithSubscription.mockResolvedValue(['1']);
        const onProgress = jest.fn();

        await service.markMissingAsError('t', 's', { onProgress });

        expect(count).toHaveBeenCalledWith({ topic: 't' });
        expect(onProgress.mock.calls.map((call) => call[0])).toEqual([
            { done: 0, total: 2 },
            { done: 2, total: 2 },
        ]);
    });
});
