const uuid = require("uuid/v4");
const { isSkip, isDebug, debug } = require("../../../helper/utils/logger");
const { getTopic } = require("../../../helper/pubsub");

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
            const eventId = item._id.toString();
            const { traceId, dataSource, data } = item;
            const topicObject = await getTopic(topic);
            const message = Buffer.from(
                JSON.stringify({
                    traceId,
                    eventId,
                    data,
                    dataSource,
                    subscription,
                })
            );
            if (isDebug()) {
                debug("REPUBLISHING...", { topic, subscription, eventId, traceId, dataSource });
            }
            const messageId = await topicObject.publish(message);
            if (isDebug()) {
                debug("REPUBLISH SUCCESS", { topic, subscription, eventId, traceId, messageId, dataSource });
            }
            await updateEvent(eventId, { messageId });
            return eventId;
        })
    );
}

module.exports = {
  publish: async (topic, data, dataSource, traceId, entityProps = {}) => {
    if (isSkip()) {
        return null;
    }
    if (isDebug()) {
        debug("BEGIN PUBLISH", { topic, data });
    }

    traceId = traceId || uuid();
    dataSource = dataSource || process.env.PUBSUB_EVENTS_DATA_SOURCE || null;
    const eventId = await createEvent(topic, traceId, data, dataSource, entityProps);

    if (isDebug()) {
        debug("PERSIST EVENT", { topic, eventId, traceId, data, dataSource });
    }

    const topicObject = await getTopic(topic);
    const message = Buffer.from(
        JSON.stringify({
            traceId,
            eventId,
            data,
            dataSource
        })
    );
    if (isDebug()) {
        debug("PUBLISHING...", { topic, eventId, traceId });
    }
    const messageId = await topicObject.publish(message);
    if (isDebug()) {
        debug("PUBLISH SUCCESS", { topic, eventId, traceId, messageId, dataSource });
    }
    await updateEvent(eventId, { messageId });
    return eventId;
  },

  republishError: async (topic, subscription, limit = Number.MAX_SAFE_INTEGER) => {
    const list = await store.getErrorEvents(topic, subscription, limit);

    if (isDebug()) {
        debug("REPUBLISH ERROR", { topic, subscription, count: list.length });
    }

    return republish(topic, subscription, list);
  },
  
  republishFail: async (topic, subscription, limit = Number.MAX_SAFE_INTEGER) => {
    const list = await store.getFailEvents(topic, subscription, limit);

    if (isDebug()) {
        debug("REPUBLISH FAIL", { topic, subscription, count: list.length });
    }

    return republish(topic, subscription, list);
  },

  republishPreconditionFail: async (topic, subscription, limit = Number.MAX_SAFE_INTEGER) => {
    const list = await store.getPreconditionFailEvents(topic, subscription, limit);

    if (isDebug()) {
        debug("REPUBLISH PRECONDITION FAIL", { topic, subscription, count: list.length });
    }

    return republish(topic, subscription, list);
  },

  republishSingleError: async (topic, subscription, events) => {
    const list = await strapi.query('event')
        .find({ id_in: events, _sort: 'createdAt:asc' });

    if (isDebug()) {
        debug("REPUBLISH SINGLE ERROR", { topic, subscription, events });
    }

    return republish(topic, subscription, list);
  },
};
