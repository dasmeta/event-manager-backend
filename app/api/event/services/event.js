const uuid = require("uuid/v4");
const { queue, logger } = require("@dasmeta/event-manager-utils");
const { dbClientFactory } = require("../../../helper/dbAdapter/dbClientFactory");
const sanitizeKeys = require("../../../helper/sanitize-keys");
const store = dbClientFactory.createClient();

const REPUBLISH_FETCH_BATCH_SIZE = 100;
const REPUBLISH_CONCURRENCY = 10;

async function createEvent(topic, traceId, data, dataSource, entityProps) {
    const body = {
        traceId,
        topic,
        data,
        dataSource,
    };

    if (entityProps.entity && entityProps.entityId) {
        body.entity = entityProps.entity;
        body.entityId = entityProps.entityId;
    }

    const createdEvent = await strapi.query('event').create(body);
    return createdEvent.id;
}

async function updateEvent(eventId, data) {
    await strapi.query("event").update({ id: eventId }, data);
}

async function mapWithConcurrency(items, concurrency, mapper) {
    const results = [];
    for (let i = 0; i < items.length; i += concurrency) {
        const slice = items.slice(i, i + concurrency);
        results.push(...await Promise.all(slice.map(mapper)));
    }
    return results;
}

async function republish(topic, subscription, list) {
    return mapWithConcurrency(list, REPUBLISH_CONCURRENCY, async item => {
        const eventId = item._id ? item._id.toString() : item.id;
        const { traceId, dataSource, data } = item;
        const topicObject = await queue.getTopic(topic);
        const message = Buffer.from(
            JSON.stringify({
                traceId,
                eventId,
                topic,
                data,
                dataSource,
                subscription,
            })
        );
        if (logger.isDebug()) {
            logger.debug("REPUBLISHING...", { topic, subscription, eventId, traceId, dataSource });
        }
        const messageId = await topicObject.publish(message);
        if (logger.isDebug()) {
            logger.debug("REPUBLISH SUCCESS", { topic, subscription, eventId, traceId, messageId, dataSource });
        }
        await updateEvent(eventId, { messageId });
        return eventId;
    });
}

function uniqueEventIds(ids) {
    const seen = new Set();
    const unique = [];
    for (const id of ids) {
        const key = id && id.toString ? id.toString() : String(id);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        unique.push(id);
    }
    return unique;
}

async function republishByEventIds(topic, subscription, ids) {
    if (!ids || !ids.length) {
        return [];
    }

    const uniqueIds = uniqueEventIds(ids);
    const results = [];
    for (let i = 0; i < uniqueIds.length; i += REPUBLISH_FETCH_BATCH_SIZE) {
        const batchIds = uniqueIds.slice(i, i + REPUBLISH_FETCH_BATCH_SIZE);
        const events = await store.getEventsByIds(batchIds);
        results.push(...await republish(topic, subscription, events || []));
    }
    return results;
}

module.exports = {
  publish: async (topic, data, dataSource, traceId, entityProps = {}) => {
    if (logger.isSkip()) {
        return null;
    }
    if (logger.isDebug()) {
        logger.debug("BEGIN PUBLISH", { topic, data });
    }

    const sanitizedData = process.env.SANITIZE_KEYS && process.env.SANITIZE_KEYS === 'true' ? sanitizeKeys(data) : data;

    traceId = traceId || uuid();
    dataSource = dataSource || process.env.PUBSUB_EVENTS_DATA_SOURCE || null;
    const eventId = await createEvent(topic, traceId, sanitizedData, dataSource, entityProps);

    if (logger.isDebug()) {
        logger.debug("PERSIST EVENT", { topic, eventId, traceId, data, dataSource });
    }

    const topicObject = await queue.getTopic(topic);
    const message = Buffer.from(
        JSON.stringify({
            traceId,
            eventId,
            topic,
            data,
            dataSource
        })
    );
    if (logger.isDebug()) {
        logger.debug("PUBLISHING...", { topic, eventId, traceId });
    }
    const messageId = await topicObject.publish(message);
    if (logger.isDebug()) {
        logger.debug("PUBLISH SUCCESS", { topic, eventId, traceId, messageId, dataSource });
    }
    await updateEvent(eventId, { messageId });
    return eventId;
  },

  async nonPersistentPublish(topic, data) {
    if (logger.isSkip()) {
        return null;
    }
    if (logger.isDebug()) {
        logger.debug("BEGIN NON-PERSISTENT PUBLISH", { topic, data });
    }

    const topicObject = await queue.getTopic(topic);
    const message = Buffer.from(
        JSON.stringify({
            data,
        })
    );
    if (logger.isDebug()) {
        logger.debug("NON-PERSISTENT PUBLISHING...", { topic });
    }
    const messageId = await topicObject.publish(message);
    if (logger.isDebug()) {
        logger.debug("NON-PERSISTENT PUBLISH SUCCESS", { topic, messageId });
    }
    return messageId;
  },

  republishError: async (topic, subscription, limit = Number.MAX_SAFE_INTEGER) => {
    const ids = await store.getErrorEventIds(topic, subscription, limit);

    if (logger.isDebug()) {
        logger.debug("REPUBLISH ERROR", { topic, subscription, count: ids.length });
    }

    return republishByEventIds(topic, subscription, ids);
  },
  
  republishFail: async (topic, subscription, limit = Number.MAX_SAFE_INTEGER) => {
    const ids = await store.getFailEventIds(topic, subscription, limit);

    if (logger.isDebug()) {
        logger.debug("REPUBLISH FAIL", { topic, subscription, count: ids.length });
    }

    return republishByEventIds(topic, subscription, ids);
  },

  republishPreconditionFail: async (topic, subscription, limit = Number.MAX_SAFE_INTEGER) => {
    const ids = await store.getPreconditionFailEventIds(topic, subscription, limit);

    if (logger.isDebug()) {
        logger.debug("REPUBLISH PRECONDITION FAIL", { topic, subscription, count: ids.length });
    }

    return republishByEventIds(topic, subscription, ids);
  },

  republishSingleError: async (topic, subscription, events, message, limit = Number.MAX_SAFE_INTEGER) => {
    const ids = events && events.length > 0
        ? events
        : await store.getErrorEventIds(topic, subscription, limit, message);

    if (logger.isDebug()) {
        logger.debug("REPUBLISH SINGLE ERROR", { topic, subscription, events });
    }

    return republishByEventIds(topic, subscription, ids);
  },
};
