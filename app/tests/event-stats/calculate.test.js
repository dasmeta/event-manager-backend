'use strict';

jest.mock('../../helper/dbAdapter/dbClientFactory', () => ({
    dbClientFactory: {
        createClient: jest.fn(),
    },
}));

describe('event-stats calculate', () => {
    let service;
    let mockStore;

    beforeEach(() => {
        jest.resetModules();
        delete process.env.USE_OLD_CALCULATE;

        mockStore = {
            getGroupedSubscriptionsForSingleTopic: jest.fn().mockResolvedValue({
                count: 4,
                success: 1,
                error: 1,
                preconditionFail: 0,
            }),
            createOrUpdateStats: jest.fn().mockResolvedValue({}),
        };

        const { dbClientFactory } = require('../../helper/dbAdapter/dbClientFactory');
        dbClientFactory.createClient.mockReturnValue(mockStore);

        strapi.query = jest.fn((model) => {
            if (model === 'event-stats') {
                return {
                    count: jest.fn().mockResolvedValue(2),
                    find: jest.fn().mockResolvedValue([
                        { topic: 't1', subscription: 's1' },
                        { topic: 't2', subscription: 's2' },
                    ]),
                };
            }
            return {
                count: jest.fn().mockResolvedValue(10),
            };
        });

        service = require('../../api/event-stats/services/event-stats');
    });

    it('recalculates without opts', async () => {
        await service.calculate();
        expect(mockStore.createOrUpdateStats).toHaveBeenCalledTimes(2);
    });

    it('reports progress per page of stats rows', async () => {
        const onProgress = jest.fn();
        await service.calculate({ onProgress });
        expect(onProgress).toHaveBeenCalledWith({ done: 2, total: 2 });
    });

    it('stops after cancel between pages', async () => {
        const signal = { cancelled: false };
        const find = jest.fn()
            .mockResolvedValueOnce([{ topic: 't1', subscription: 's1' }])
            .mockResolvedValueOnce([{ topic: 't2', subscription: 's2' }]);
        strapi.query = jest.fn((model) => {
            if (model === 'event-stats') {
                return {
                    count: jest.fn().mockResolvedValue(11),
                    find,
                };
            }
            return { count: jest.fn().mockResolvedValue(10) };
        });
        service = require('../../api/event-stats/services/event-stats');

        mockStore.createOrUpdateStats.mockImplementation(async () => {
            signal.cancelled = true;
        });

        await service.calculate({ signal });
        expect(find).toHaveBeenCalledTimes(1);
        expect(mockStore.createOrUpdateStats).toHaveBeenCalledTimes(1);
    });
});
