'use strict';

jest.mock('@dasmeta/event-manager-utils', () => ({
    queue: {
        getTopic: jest.fn(),
    },
    logger: {
        isDebug: jest.fn(() => false),
        isSkip: jest.fn(() => false),
        debug: jest.fn(),
    },
}));

jest.mock('../../helper/dbAdapter/dbClientFactory', () => ({
    dbClientFactory: {
        createClient: jest.fn(),
    },
}));

describe('republish batching', () => {
    const FETCH_BATCH_SIZE = 100;
    let eventService;
    let mockStore;
    let publish;

    function ids(count) {
        return Array.from({ length: count }, (_, i) => i + 1);
    }

    function eventsFromIds(eventIds) {
        return eventIds.map((id) => ({
            id,
            traceId: `trace-${id}`,
            dataSource: 'src',
            data: { n: id },
        }));
    }

    beforeEach(() => {
        jest.resetModules();

        mockStore = {
            getErrorEventIds: jest.fn(),
            getFailEventIds: jest.fn(),
            getPreconditionFailEventIds: jest.fn(),
            getEventsByIds: jest.fn(async (eventIds) => eventsFromIds(eventIds)),
            getErrorEvents: jest.fn(),
            getFailEvents: jest.fn(),
            getPreconditionFailEvents: jest.fn(),
        };

        const { dbClientFactory } = require('../../helper/dbAdapter/dbClientFactory');
        dbClientFactory.createClient.mockReturnValue(mockStore);

        publish = jest.fn().mockResolvedValue('mid');
        const { queue } = require('@dasmeta/event-manager-utils');
        queue.getTopic.mockResolvedValue({ publish });

        strapi.query = jest.fn(() => ({
            update: jest.fn().mockResolvedValue({}),
            create: jest.fn(),
        }));

        eventService = require('../../api/event/services/event');
    });

    it('loads error event payloads in batches instead of all at once', async () => {
        const eventIds = ids(FETCH_BATCH_SIZE + 25);
        mockStore.getErrorEventIds.mockResolvedValue(eventIds);

        await eventService.republishError('topic', 'sub');

        expect(mockStore.getErrorEvents).not.toHaveBeenCalled();
        expect(mockStore.getErrorEventIds).toHaveBeenCalledWith('topic', 'sub', Number.MAX_SAFE_INTEGER);
        expect(mockStore.getEventsByIds.mock.calls.map((call) => call[0])).toEqual([
            eventIds.slice(0, FETCH_BATCH_SIZE),
            eventIds.slice(FETCH_BATCH_SIZE),
        ]);
        expect(publish).toHaveBeenCalledTimes(eventIds.length);
    });

    it('respects limit when collecting error event ids', async () => {
        mockStore.getErrorEventIds.mockResolvedValue([1, 2, 3]);

        await eventService.republishError('topic', 'sub', 3);

        expect(mockStore.getErrorEventIds).toHaveBeenCalledWith('topic', 'sub', 3);
        expect(publish).toHaveBeenCalledTimes(3);
    });

    it('does not fetch payloads when there are no ids', async () => {
        mockStore.getErrorEventIds.mockResolvedValue([]);

        await eventService.republishError('topic', 'sub');

        expect(mockStore.getEventsByIds).not.toHaveBeenCalled();
        expect(publish).not.toHaveBeenCalled();
    });

    it('batches explicit event ids for single-error republish', async () => {
        const eventIds = ids(FETCH_BATCH_SIZE + 1);

        await eventService.republishSingleError('topic', 'sub', eventIds, null);

        expect(mockStore.getErrorEventIds).not.toHaveBeenCalled();
        expect(mockStore.getEventsByIds.mock.calls.map((call) => call[0])).toEqual([
            eventIds.slice(0, FETCH_BATCH_SIZE),
            eventIds.slice(FETCH_BATCH_SIZE),
        ]);
        expect(publish).toHaveBeenCalledTimes(eventIds.length);
    });

    it('publishes duplicate event ids only once even across batches', async () => {
        const uniqueIds = ids(FETCH_BATCH_SIZE);
        const eventIds = [...uniqueIds, uniqueIds[0]];
        mockStore.getErrorEventIds.mockResolvedValue(eventIds);

        await eventService.republishError('topic', 'sub');

        expect(mockStore.getEventsByIds.mock.calls.map((call) => call[0])).toEqual([uniqueIds]);
        expect(publish).toHaveBeenCalledTimes(uniqueIds.length);
    });
});
