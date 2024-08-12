const uuid = require("uuid/v4");
const { queue, logger } = require("@dasmeta/event-manager-utils");
const { dbClientFactory } = require("../../../helper/dbAdapter/dbClientFactory");
const sanitizeKeys = require("../../../helper/sanitize-keys");
const store = dbClientFactory.createClient();

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

async function republish(topic, subscription, list) {
    return Promise.all(
        list.map(async item => {
            const eventId = item._id ? item._id.toString() : item.id;
            const { traceId, dataSource, data } = item;
            const topicObject = await queue.getTopic(topic);
            const message = Buffer.from(
                JSON.stringify({
                    traceId,
                    eventId,
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
        })
    );
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
    const list = await store.getErrorEvents(topic, subscription, limit);

    if (logger.isDebug()) {
        logger.debug("REPUBLISH ERROR", { topic, subscription, count: list.length });
    }

    return republish(topic, subscription, list);
  },
  
  republishFail: async (topic, subscription, limit = Number.MAX_SAFE_INTEGER) => {
    const list = await store.getFailEvents(topic, subscription, limit);

    if (logger.isDebug()) {
        logger.debug("REPUBLISH FAIL", { topic, subscription, count: list.length });
    }

    return republish(topic, subscription, list);
  },

  republishPreconditionFail: async (topic, subscription, limit = Number.MAX_SAFE_INTEGER) => {
    const list = await store.getPreconditionFailEvents(topic, subscription, limit);

    if (logger.isDebug()) {
        logger.debug("REPUBLISH PRECONDITION FAIL", { topic, subscription, count: list.length });
    }

    return republish(topic, subscription, list);
  },

  republishSingleError: async (topic, subscription, events) => {
    const list = await store.getEventsByIds(events);

    console.log(list);

    if (logger.isDebug()) {
        logger.debug("REPUBLISH SINGLE ERROR", { topic, subscription, events });
    }

    return republish(topic, subscription, list);
  },
};
