'use strict';

const { client } = require('../../helper/dbAdapter/mongo');
const { getMongoIndexes } = require('../../helper/dbAdapter/indexes');

describe('mongo ensureIndexes', () => {
    let store;
    let eventCollection;
    let subscriptionCollection;

    beforeEach(() => {
        store = new client();
        eventCollection = {
            indexes: jest.fn(),
            createIndex: jest.fn().mockResolvedValue('ok'),
            dropIndex: jest.fn().mockResolvedValue('ok'),
        };
        subscriptionCollection = {
            indexes: jest.fn(),
            createIndex: jest.fn().mockResolvedValue('ok'),
            dropIndex: jest.fn().mockResolvedValue('ok'),
        };

        strapi.query = jest.fn((model) => {
            if (model === 'event') {
                return { model: { collection: eventCollection } };
            }
            if (model === 'event-subscription') {
                return { model: { collection: subscriptionCollection } };
            }
            return { model: {} };
        });
    });

    it('creates missing named indexes', async () => {
        eventCollection.indexes.mockResolvedValue([]);
        subscriptionCollection.indexes.mockResolvedValue([]);

        await store.ensureIndexes();

        const catalog = getMongoIndexes();
        const eventIndexes = catalog.filter((i) => i.collection === 'event');
        const subIndexes = catalog.filter((i) => i.collection === 'event_subscription');

        expect(eventCollection.createIndex).toHaveBeenCalledTimes(eventIndexes.length);
        expect(subscriptionCollection.createIndex).toHaveBeenCalledTimes(subIndexes.length);
        expect(eventCollection.dropIndex).not.toHaveBeenCalled();
    });

    it('skips existing indexes with same keys', async () => {
        const catalog = getMongoIndexes();
        eventCollection.indexes.mockResolvedValue(
            catalog.filter((i) => i.collection === 'event').map((i) => ({ name: i.name, key: i.keys }))
        );
        subscriptionCollection.indexes.mockResolvedValue(
            catalog.filter((i) => i.collection === 'event_subscription').map((i) => ({ name: i.name, key: i.keys }))
        );

        await store.ensureIndexes();

        expect(eventCollection.createIndex).not.toHaveBeenCalled();
        expect(subscriptionCollection.createIndex).not.toHaveBeenCalled();
        expect(eventCollection.dropIndex).not.toHaveBeenCalled();
    });

    it('drops and recreates when keys drifted', async () => {
        const catalog = getMongoIndexes();
        const firstEvent = catalog.find((i) => i.collection === 'event');

        eventCollection.indexes.mockResolvedValue([
            { name: firstEvent.name, key: { wrong: 1 } },
            ...catalog
                .filter((i) => i.collection === 'event' && i.name !== firstEvent.name)
                .map((i) => ({ name: i.name, key: i.keys })),
        ]);
        subscriptionCollection.indexes.mockResolvedValue(
            catalog.filter((i) => i.collection === 'event_subscription').map((i) => ({ name: i.name, key: i.keys }))
        );

        await store.ensureIndexes();

        expect(eventCollection.dropIndex).toHaveBeenCalledWith(firstEvent.name);
        expect(eventCollection.createIndex).toHaveBeenCalledWith(
            firstEvent.keys,
            expect.objectContaining({ name: firstEvent.name })
        );
    });

    it('does not drop indexes outside the catalog', async () => {
        const catalog = getMongoIndexes();
        eventCollection.indexes.mockResolvedValue([
            { name: 'unrelated_manual_index', key: { foo: 1 } },
            ...catalog.filter((i) => i.collection === 'event').map((i) => ({ name: i.name, key: i.keys })),
        ]);
        subscriptionCollection.indexes.mockResolvedValue(
            catalog.filter((i) => i.collection === 'event_subscription').map((i) => ({ name: i.name, key: i.keys }))
        );

        await store.ensureIndexes();

        expect(eventCollection.dropIndex).not.toHaveBeenCalled();
        expect(eventCollection.createIndex).not.toHaveBeenCalled();
    });
});
