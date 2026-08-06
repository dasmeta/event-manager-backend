'use strict';

/**
 * Minimal chainable knex mock for unit tests.
 */
function createQueryBuilder(initialResult) {
    const state = {
        result: initialResult,
        calls: [],
    };

    const builder = {
        _state: state,
        where(...args) {
            state.calls.push(['where', args]);
            return builder;
        },
        whereIn(...args) {
            state.calls.push(['whereIn', args]);
            return builder;
        },
        whereRaw(...args) {
            state.calls.push(['whereRaw', args]);
            return builder;
        },
        whereNull(...args) {
            state.calls.push(['whereNull', args]);
            return builder;
        },
        orWhereNull(...args) {
            state.calls.push(['orWhereNull', args]);
            return builder;
        },
        leftJoin(...args) {
            state.calls.push(['leftJoin', args]);
            return builder;
        },
        select(...args) {
            state.calls.push(['select', args]);
            return builder;
        },
        groupBy(...args) {
            state.calls.push(['groupBy', args]);
            return builder;
        },
        groupByRaw(...args) {
            state.calls.push(['groupByRaw', args]);
            return builder;
        },
        orderBy(...args) {
            state.calls.push(['orderBy', args]);
            return builder;
        },
        offset(...args) {
            state.calls.push(['offset', args]);
            return builder;
        },
        limit(...args) {
            state.calls.push(['limit', args]);
            return builder;
        },
        havingRaw(...args) {
            state.calls.push(['havingRaw', args]);
            return builder;
        },
        havingNotIn(...args) {
            state.calls.push(['havingNotIn', args]);
            return builder;
        },
        distinct(...args) {
            state.calls.push(['distinct', args]);
            return builder;
        },
        update(...args) {
            state.calls.push(['update', args]);
            return Promise.resolve(1);
        },
        insert(...args) {
            state.calls.push(['insert', args]);
            return Promise.resolve([1]);
        },
        delete(...args) {
            state.calls.push(['delete', args]);
            return Promise.resolve(1);
        },
        first(...args) {
            state.calls.push(['first', args]);
            if (Array.isArray(state.result)) {
                return Promise.resolve(state.result[0]);
            }
            return Promise.resolve(state.result);
        },
        then(resolve, reject) {
            return Promise.resolve(state.result).then(resolve, reject);
        },
        catch(reject) {
            return Promise.resolve(state.result).catch(reject);
        },
    };

    // Support knex('table')(function(){ this.whereNull...})
    builder.where = new Proxy(builder.where, {
        apply(target, thisArg, argList) {
            if (typeof argList[0] === 'function') {
                state.calls.push(['where', ['[fn]']]);
                argList[0].call(builder);
                return builder;
            }
            return target.apply(thisArg, argList);
        },
    });

    return builder;
}

function createKnexMock(handlers = {}) {
    const builders = [];
    const rawCalls = [];

    const knex = (table) => {
        const key = typeof table === 'string' ? table : String(table);
        const result = typeof handlers[key] === 'function'
            ? handlers[key]()
            : (handlers[key] !== undefined ? handlers[key] : []);
        const builder = createQueryBuilder(result);
        builders.push({ table: key, builder });
        return builder;
    };

    knex.raw = jest.fn((sql, bindings) => {
        rawCalls.push({ sql, bindings });
        return { sql, bindings };
    });

    knex._builders = builders;
    knex._rawCalls = rawCalls;

    return knex;
}

function createBookshelfCollection(rows = []) {
    return {
        toJSON: () => rows,
        length: rows.length,
    };
}

module.exports = {
    createQueryBuilder,
    createKnexMock,
    createBookshelfCollection,
};
