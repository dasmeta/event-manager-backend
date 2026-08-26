'use strict';

const { client } = require('../../helper/dbAdapter/postgres');
const { createKnexMock, createBookshelfCollection } = require('../helpers/mockStrapi');

describe('postgres db adapter', () => {
    let store;

    beforeEach(() => {
        store = new client();
        jest.clearAllMocks();
    });

    describe('updateSubscriptionByEvents', () => {
        it('updates by eventIds when list is non-empty and uses data payload', async () => {
            const knex = createKnexMock({ event_subscription: [] });
            strapi.connections.default = knex;

            const data = { isSuccess: true, isError: false };
            await store.updateSubscriptionByEvents('t', 's', [1, 2], 'ignored-message', data);

            const { builder } = knex._builders[0];
            const calls = builder._state.calls;
            expect(calls).toEqual(
                expect.arrayContaining([
                    ['where', [{ topic: 't', subscription: 's' }]],
                    ['whereIn', ['eventId', [1, 2]]],
                    ['update', [data]],
                ])
            );
            expect(calls.find((c) => c[0] === 'whereRaw')).toBeUndefined();
        });

        it('updates by error message when eventIds is empty', async () => {
            const knex = createKnexMock({ event_subscription: [] });
            strapi.connections.default = knex;

            const data = { isSuccess: true };
            await store.updateSubscriptionByEvents('t', 's', [], 'boom', data);

            const { builder } = knex._builders[0];
            const calls = builder._state.calls;
            expect(calls).toEqual(
                expect.arrayContaining([
                    ['where', [{ topic: 't', subscription: 's' }]],
                    ['whereRaw', ["error->>'message' = ?", ['boom']]],
                    ['update', [data]],
                ])
            );
            expect(calls.find((c) => c[0] === 'whereIn')).toBeUndefined();
        });
    });

    describe('getGroupedSubscriptionsForSingleTopic', () => {
        it('returns a plain object with counts', async () => {
            const knex = createKnexMock({
                event_subscription: [{ count: '10', success: '7', error: '2', preconditionFail: '1' }],
            });
            strapi.connections.default = knex;

            const result = await store.getGroupedSubscriptionsForSingleTopic('t', 's');

            expect(Array.isArray(result)).toBe(false);
            expect(result).toEqual({
                count: 10,
                success: 7,
                error: 2,
                preconditionFail: 1,
            });
        });

        it('returns zeros when no rows', async () => {
            const knex = createKnexMock({
                event_subscription: [],
            });
            knex.raw = jest.fn((sql) => sql);
            strapi.connections.default = knex;

            const result = await store.getGroupedSubscriptionsForSingleTopic('t', 's');
            expect(result).toEqual({
                count: 0,
                success: 0,
                error: 0,
                preconditionFail: 0,
            });
        });
    });

    describe('getErrorEvents', () => {
        function mockSubscriptionQuery({ rows, expectMessage }) {
            const qb = {
                where: jest.fn().mockReturnThis(),
                whereRaw: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
            };

            strapi.query = jest.fn((model) => {
                if (model === 'event-subscription') {
                    return {
                        model: {
                            query: (fn) => {
                                fn(qb);
                                if (expectMessage) {
                                    expect(qb.whereRaw).toHaveBeenCalledWith(
                                        "error->>'message' = ?",
                                        [expectMessage]
                                    );
                                } else {
                                    expect(qb.whereRaw).not.toHaveBeenCalled();
                                }
                                return {
                                    fetchPage: async () => createBookshelfCollection(rows),
                                };
                            },
                        },
                    };
                }
                if (model === 'event') {
                    return {
                        model: {
                            where() { return this; },
                            orderBy() { return this; },
                            fetchAll: async () => createBookshelfCollection(
                                rows.map((r) => ({ id: r.eventId, topic: 't' }))
                            ),
                        },
                    };
                }
                return {};
            });
        }

        it('does not filter by message when message is omitted', async () => {
            mockSubscriptionQuery({ rows: [{ eventId: 1 }], expectMessage: null });
            const result = await store.getErrorEvents('t', 's', 10);
            expect(result).toEqual([{ id: 1, topic: 't' }]);
        });

        it('filters by error message when provided', async () => {
            mockSubscriptionQuery({ rows: [{ eventId: 2 }], expectMessage: 'timeout' });
            const result = await store.getErrorEvents('t', 's', 10, 'timeout');
            expect(result).toEqual([{ id: 2, topic: 't' }]);
        });
    });

    describe('getErrorEventIds', () => {
        function mockSubscriptionIds({ rows, expectMessage }) {
            const qb = {
                where: jest.fn().mockReturnThis(),
                whereRaw: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
            };

            strapi.query = jest.fn((model) => {
                if (model === 'event-subscription') {
                    return {
                        model: {
                            query: (fn) => {
                                fn(qb);
                                if (expectMessage) {
                                    expect(qb.whereRaw).toHaveBeenCalledWith(
                                        "error->>'message' = ?",
                                        [expectMessage]
                                    );
                                } else {
                                    expect(qb.whereRaw).not.toHaveBeenCalled();
                                }
                                return {
                                    fetchPage: async () => createBookshelfCollection(rows),
                                };
                            },
                        },
                    };
                }
                throw new Error(`unexpected model query: ${model}`);
            });
        }

        it('returns only event ids and does not load event payloads', async () => {
            mockSubscriptionIds({ rows: [{ eventId: 1 }, { eventId: 2 }], expectMessage: null });
            const result = await store.getErrorEventIds('t', 's', 10);
            expect(result).toEqual([1, 2]);
            expect(strapi.query).not.toHaveBeenCalledWith('event');
        });

        it('filters ids by error message when provided', async () => {
            mockSubscriptionIds({ rows: [{ eventId: 9 }], expectMessage: 'timeout' });
            const result = await store.getErrorEventIds('t', 's', 10, 'timeout');
            expect(result).toEqual([9]);
        });
    });

    describe('getErrors', () => {
        it('uses default start/limit and caps eventIds at 20', async () => {
            let call = 0;
            const knex = (table) => {
                call += 1;
                if (call === 1) {
                    // groups query
                    const builder = {
                        where() { return builder; },
                        select() { return builder; },
                        groupByRaw() { return builder; },
                        orderBy(field, dir) {
                            expect(field).toBe('count');
                            expect(dir).toBe('desc');
                            return builder;
                        },
                        offset(v) {
                            expect(v).toBe(0);
                            return builder;
                        },
                        limit(v) {
                            expect(v).toBe(5);
                            return builder;
                        },
                        then(resolve) {
                            return Promise.resolve([{ _id: 'err-a', count: '3' }]).then(resolve);
                        },
                    };
                    return builder;
                }
                // details query
                const details = Array.from({ length: 25 }, (_, i) => ({
                    eventId: i + 1,
                    error: { message: 'err-a' },
                }));
                const builder = {
                    where() { return builder; },
                    whereRaw() { return builder; },
                    orderBy() { return builder; },
                    limit(v) {
                        expect(v).toBe(20);
                        return builder;
                    },
                    select() { return builder; },
                    then(resolve) {
                        return Promise.resolve(details.slice(0, 20)).then(resolve);
                    },
                };
                return builder;
            };
            knex.raw = jest.fn((sql) => sql);
            strapi.connections.default = knex;

            const result = await store.getErrors('t', 's');
            expect(result).toHaveLength(1);
            expect(result[0]._id).toBe('err-a');
            expect(result[0].count).toBe(3);
            expect(result[0].eventIds).toHaveLength(20);
            expect(result[0].error).toEqual({ message: 'err-a' });
        });

        it('respects custom start and limit', async () => {
            let call = 0;
            const knex = () => {
                call += 1;
                if (call === 1) {
                    const builder = {
                        where() { return builder; },
                        select() { return builder; },
                        groupByRaw() { return builder; },
                        orderBy() { return builder; },
                        offset(v) {
                            expect(v).toBe(5);
                            return builder;
                        },
                        limit(v) {
                            expect(v).toBe(2);
                            return builder;
                        },
                        then(resolve) {
                            return Promise.resolve([]).then(resolve);
                        },
                    };
                    return builder;
                }
                return {
                    then(resolve) { return Promise.resolve([]).then(resolve); },
                };
            };
            knex.raw = jest.fn((sql) => sql);
            strapi.connections.default = knex;

            const result = await store.getErrors('t', 's', 5, 2);
            expect(result).toEqual([]);
        });
    });

    describe('retention', () => {
        it('getFirstSubscription orders by created_at asc', async () => {
            const row = { id: 1, created_at: new Date('2020-01-01') };
            const knex = createKnexMock({ event_subscription: [row] });
            strapi.connections.default = knex;

            const result = await store.getFirstSubscription();
            expect(result).toEqual(row);
            const calls = knex._builders[0].builder._state.calls;
            expect(calls).toEqual(
                expect.arrayContaining([['orderBy', ['created_at', 'asc']]])
            );
        });

        it('getEventsToRemove returns [] when start or end missing', async () => {
            expect(await store.getEventsToRemove(null, Date.now())).toEqual([]);
            expect(await store.getEventsToRemove(Date.now(), null)).toEqual([]);
        });

        it('getEventsToRemove returns only fully succeeded eventIds', async () => {
            const knex = createKnexMock({
                event_subscription: [{ eventId: 11 }, { eventId: 22 }],
            });
            strapi.connections.default = knex;

            const result = await store.getEventsToRemove(1, 2);
            expect(result).toEqual([11, 22]);
            const calls = knex._builders[0].builder._state.calls;
            expect(calls.find((c) => c[0] === 'havingRaw')).toBeTruthy();
        });

        it('archiveData is no-op for empty ids', async () => {
            const knex = createKnexMock({});
            strapi.connections.default = knex;
            await store.archiveData([]);
            expect(knex._builders).toHaveLength(0);
        });

        it('archiveData inserts archives then deletes live rows', async () => {
            const order = [];
            const knex = (table) => {
                const builder = {
                    whereIn() { return builder; },
                    insert(rows) {
                        order.push(['insert', table, rows.length]);
                        return Promise.resolve([1]);
                    },
                    delete() {
                        order.push(['delete', table]);
                        return Promise.resolve(1);
                    },
                    then(resolve) {
                        if (table === 'event') {
                            return Promise.resolve([{ id: 1, topic: 't', data: {} }]).then(resolve);
                        }
                        if (table === 'event_subscription') {
                            return Promise.resolve([{ id: 9, eventId: 1, subscription: 's' }]).then(resolve);
                        }
                        return Promise.resolve([]).then(resolve);
                    },
                };
                return builder;
            };
            knex.raw = jest.fn();
            strapi.connections.default = knex;

            await store.archiveData([1]);

            expect(order).toEqual([
                ['insert', 'event_archives', 1],
                ['insert', 'event_subscription_archives', 1],
                ['delete', 'event_subscription'],
                ['delete', 'event'],
            ]);
        });
    });

    describe('polish', () => {
        it('removeUnnecessarySubscriptions awaits duplicate deletes', async () => {
            const deleted = [];
            store.getSubscriptionsWithoutEvents = jest.fn().mockResolvedValue([{ id: 1 }]);
            store.getDuplicateSubscriptions = jest.fn().mockResolvedValue([
                { id: 10, createdAts: [new Date('2020-01-01'), new Date('2020-01-02')] },
            ]);

            const knex = (table) => {
                const builder = {
                    whereIn(field, values) {
                        builder._whereIn = { field, values };
                        return builder;
                    },
                    where() { return builder; },
                    delete() {
                        deleted.push(builder._whereIn);
                        return Promise.resolve(1);
                    },
                };
                return builder;
            };
            strapi.connections.default = knex;

            await store.removeUnnecessarySubscriptions('t', 's');

            expect(deleted.length).toBe(2);
            expect(deleted[0]).toEqual({ field: 'id', values: [1] });
            expect(deleted[1].field).toBe('created_at');
            expect(deleted[1].values).toHaveLength(1);
        });

        it('getSubscriptionsWithoutEvents left-joins event for missing rows', async () => {
            const knex = createKnexMock({ 'event_subscription as es': [] });
            strapi.connections.default = knex;

            await store.getSubscriptionsWithoutEvents('t', 's');
            const calls = knex._builders[0].builder._state.calls;
            expect(calls).toEqual(
                expect.arrayContaining([
                    ['leftJoin', ['event as e', 'es.eventId', 'e.id']],
                ])
            );
            expect(calls.find((c) => c[0] === 'where' && c[1][0] === 'eventId' && c[1][1] === 'is')).toBeUndefined();
        });
    });

    describe('ensureIndexes', () => {
        it('creates missing indexes', async () => {
            const rawSql = [];
            let pgCall = 0;
            const knex = (table) => {
                if (table === 'pg_indexes') {
                    pgCall += 1;
                    return {
                        where() { return this; },
                        first: async () => undefined,
                    };
                }
                return createKnexMock({})(table);
            };
            knex.raw = jest.fn(async (sql) => {
                rawSql.push(sql);
                return [];
            });
            strapi.connections.default = knex;

            await store.ensureIndexes();
            expect(rawSql.length).toBeGreaterThan(0);
            expect(rawSql.every((sql) => sql.startsWith('CREATE INDEX'))).toBe(true);
        });

        it('skips existing indexes with matching columns', async () => {
            const rawSql = [];
            const { getPostgresIndexes } = require('../../helper/dbAdapter/indexes');
            const catalog = getPostgresIndexes();
            const knex2 = (table) => {
                if (table === 'pg_indexes') {
                    let currentName;
                    return {
                        where({ indexname }) {
                            currentName = indexname;
                            return this;
                        },
                        first: async () => {
                            const entry = catalog.find((i) => i.name === currentName);
                            return {
                                indexname: currentName,
                                indexdef: entry.createSql,
                            };
                        },
                    };
                }
                return {};
            };
            knex2.raw = jest.fn(async (sql) => {
                rawSql.push(sql);
            });
            strapi.connections.default = knex2;

            await store.ensureIndexes();
            expect(rawSql).toEqual([]);
        });

        it('drops and recreates when columns drifted', async () => {
            const rawSql = [];
            const { getPostgresIndexes } = require('../../helper/dbAdapter/indexes');
            const catalog = getPostgresIndexes();
            const knex = (table) => {
                if (table === 'pg_indexes') {
                    let currentName;
                    return {
                        where({ indexname }) {
                            currentName = indexname;
                            return this;
                        },
                        first: async () => ({
                            indexname: currentName,
                            indexdef: `CREATE INDEX ${currentName} ON wrong_table USING btree (foo)`,
                        }),
                    };
                }
                return {};
            };
            knex.raw = jest.fn(async (sql) => {
                rawSql.push(sql);
            });
            strapi.connections.default = knex;

            await store.ensureIndexes();
            expect(rawSql.some((s) => s.startsWith('DROP INDEX'))).toBe(true);
            expect(rawSql.filter((s) => s.startsWith('CREATE INDEX')).length).toBe(catalog.length);
        });

        it('does not drop indexes outside the catalog', async () => {
            const dropped = [];
            const { getPostgresIndexes } = require('../../helper/dbAdapter/indexes');
            const catalogNames = new Set(getPostgresIndexes().map((i) => i.name));
            const knex = (table) => {
                if (table === 'pg_indexes') {
                    return {
                        where({ indexname }) {
                            this._name = indexname;
                            return this;
                        },
                        first: async () => undefined,
                    };
                }
                return {};
            };
            knex.raw = jest.fn(async (sql) => {
                if (sql.startsWith('DROP INDEX')) {
                    const match = sql.match(/"([^"]+)"/);
                    if (match) dropped.push(match[1]);
                }
            });
            strapi.connections.default = knex;

            await store.ensureIndexes();
            expect(dropped.every((name) => catalogNames.has(name))).toBe(true);
            expect(dropped).not.toContain('some_unrelated_index');
        });
    });
});
