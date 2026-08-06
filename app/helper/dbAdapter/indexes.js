/**
 * Shared performance index catalog for event-manager.
 * Collections/tables are created by Strapi; these indexes are applied
 * via native createIndex / CREATE INDEX on bootstrap.
 */

const EVENT = 'event';
const EVENT_SUBSCRIPTION = 'event_subscription';

const INDEX_CATALOG = [
    // event
    { name: 'em_event_entity_entityId', collection: EVENT, mongoKeys: { entity: 1, entityId: 1 }, postgresColumns: ['entity', '"entityId"'] },
    { name: 'em_event_entity_entityId_createdAt', collection: EVENT, mongoKeys: { entity: 1, entityId: 1, createdAt: 1 }, postgresColumns: ['entity', '"entityId"', 'created_at'] },
    { name: 'em_event_topic', collection: EVENT, mongoKeys: { topic: 1 }, postgresColumns: ['topic'] },

    // event_subscription
    { name: 'em_es_createdAt', collection: EVENT_SUBSCRIPTION, mongoKeys: { createdAt: -1 }, postgresColumns: ['created_at DESC'] },
    { name: 'em_es_eventId', collection: EVENT_SUBSCRIPTION, mongoKeys: { eventId: 1 }, postgresColumns: ['"eventId"'] },
    { name: 'em_es_eventId_createdAt', collection: EVENT_SUBSCRIPTION, mongoKeys: { eventId: 1, createdAt: 1 }, postgresColumns: ['"eventId"', 'created_at'] },
    { name: 'em_es_eventId_subscription', collection: EVENT_SUBSCRIPTION, mongoKeys: { eventId: 1, subscription: 1 }, postgresColumns: ['"eventId"', 'subscription'] },
    { name: 'em_es_isError', collection: EVENT_SUBSCRIPTION, mongoKeys: { isError: 1 }, postgresColumns: ['"isError"'] },
    { name: 'em_es_isError_isPF_isSuccess_updatedAt', collection: EVENT_SUBSCRIPTION, mongoKeys: { isError: 1, isPreconditionFail: 1, isSuccess: 1, updatedAt: 1 }, postgresColumns: ['"isError"', '"isPreconditionFail"', '"isSuccess"', 'updated_at'] },
    { name: 'em_es_isPreconditionFail', collection: EVENT_SUBSCRIPTION, mongoKeys: { isPreconditionFail: 1 }, postgresColumns: ['"isPreconditionFail"'] },
    { name: 'em_es_isSuccess', collection: EVENT_SUBSCRIPTION, mongoKeys: { isSuccess: 1 }, postgresColumns: ['"isSuccess"'] },
    { name: 'em_es_subscription', collection: EVENT_SUBSCRIPTION, mongoKeys: { subscription: 1 }, postgresColumns: ['subscription'] },
    { name: 'em_es_topic', collection: EVENT_SUBSCRIPTION, mongoKeys: { topic: 1 }, postgresColumns: ['topic'] },
    { name: 'em_es_topic_subscription', collection: EVENT_SUBSCRIPTION, mongoKeys: { topic: 1, subscription: 1 }, postgresColumns: ['topic', 'subscription'] },
    { name: 'em_es_topic_sub_isError_msg_updatedAt', collection: EVENT_SUBSCRIPTION, mongoKeys: { topic: 1, subscription: 1, isError: 1, 'error.message': 1, updatedAt: -1 }, postgresColumns: ['topic', 'subscription', '"isError"', "((error->>'message'))", 'updated_at DESC'] },
    { name: 'em_es_topic_sub_isError_isPF_isSuccess', collection: EVENT_SUBSCRIPTION, mongoKeys: { topic: 1, subscription: 1, isError: 1, isPreconditionFail: 1, isSuccess: 1 }, postgresColumns: ['topic', 'subscription', '"isError"', '"isPreconditionFail"', '"isSuccess"'] },
    { name: 'em_es_topic_sub_flags_createdAt', collection: EVENT_SUBSCRIPTION, mongoKeys: { topic: 1, subscription: 1, isError: 1, isPreconditionFail: 1, isSuccess: 1, createdAt: 1 }, postgresColumns: ['topic', 'subscription', '"isError"', '"isPreconditionFail"', '"isSuccess"', 'created_at'] },
    { name: 'em_es_topic_subscription_isSuccess', collection: EVENT_SUBSCRIPTION, mongoKeys: { topic: 1, subscription: 1, isSuccess: 1 }, postgresColumns: ['topic', 'subscription', '"isSuccess"'] },
    { name: 'em_es_topic_sub_flags_msg_createdAt', collection: EVENT_SUBSCRIPTION, mongoKeys: { topic: 1, subscription: 1, isError: 1, isPreconditionFail: 1, isSuccess: 1, 'error.message': 1, createdAt: 1 }, postgresColumns: ['topic', 'subscription', '"isError"', '"isPreconditionFail"', '"isSuccess"', "((error->>'message'))", 'created_at'] },
];

function normalizeMongoKeys(keys) {
    return Object.keys(keys)
        .sort()
        .reduce((acc, key) => {
            acc[key] = keys[key];
            return acc;
        }, {});
}

function mongoKeysEqual(a, b) {
    const left = normalizeMongoKeys(a || {});
    const right = normalizeMongoKeys(b || {});
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
        return false;
    }
    return leftKeys.every((key) => left[key] === right[key]);
}

function getMongoIndexes() {
    return INDEX_CATALOG.map((entry) => ({
        name: entry.name,
        collection: entry.collection,
        keys: entry.mongoKeys,
    }));
}

function getPostgresIndexes() {
    return INDEX_CATALOG.map((entry) => {
        const columns = entry.postgresColumns.join(', ');
        const createSql = `CREATE INDEX "${entry.name}" ON "${entry.collection}" (${columns})`;
        // Postgres normalizes CREATE INDEX output in pg_indexes.indexdef
        const indexdef = `CREATE INDEX ${entry.name} ON public.${entry.collection} USING btree (${columns.replace(/"/g, '')})`;
        return {
            name: entry.name,
            table: entry.collection,
            columns: entry.postgresColumns,
            createSql,
            // Used for drift detection; compare loosely via normalized createSql when exact indexdef differs
            indexdef: createSql,
        };
    });
}

module.exports = {
    INDEX_CATALOG,
    EVENT,
    EVENT_SUBSCRIPTION,
    getMongoIndexes,
    getPostgresIndexes,
    mongoKeysEqual,
};
