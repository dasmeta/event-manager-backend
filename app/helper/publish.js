const store = require("./helper/store");
const { isSkip, isDebug, debug } = require("./helper/logger");
const { getTopic } = require("./pubsub");
const uuid = require("uuid/v4");

const republish = (topic, subscription, list) =>
    Promise.all(
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
            await store.updateEvent(eventId, { messageId });
            return eventId;
        })
    );

module.exports = {
    async publish(topic, data, dataSource, traceId, entityProps = {}) {
        if (isSkip()) {
            return null;
        }
        if (isDebug()) {
            debug("BEGIN PUBLISH", { topic, data });
        }

        traceId = traceId || uuid();
        dataSource = dataSource || process.env.PUBSUB_EVENTS_DATA_SOURCE || null;
        const eventId = await store.createEvent(topic, traceId, data, dataSource, entityProps);

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
        await store.updateEvent(eventId, { messageId });
        return eventId;
    },

    async nonPersistentPublish(topic, data) {
        if (isSkip()) {
            return null;
        }
        if (isDebug()) {
            debug("BEGIN NON-PERSISTENT PUBLISH", { topic, data });
        }

        const topicObject = await getTopic(topic);
        const message = Buffer.from(
            JSON.stringify({
                data,
            })
        );
        if (isDebug()) {
            debug("NON-PERSISTENT PUBLISHING...", { topic });
        }
        const messageId = await topicObject.publish(message);
        if (isDebug()) {
            debug("NON-PERSISTENT PUBLISH SUCCESS", { topic, messageId });
        }
        return messageId;
    },
    async republishFail(topic, subscription, limit = Number.MAX_SAFE_INTEGER) {
        const list = await store.getFailEvent(topic, subscription, limit);

        if (isDebug()) {
            debug("REPUBLISH FAIL", { topic, subscription, count: list.length });
        }

        return await republish(topic, subscription, list);
    },
    async republishError(topic, subscription, limit = Number.MAX_SAFE_INTEGER) {
        const list = await store.getErrorEvent(topic, subscription, limit);

        if (isDebug()) {
            debug("REPUBLISH ERROR", { topic, subscription, count: list.length });
        }

        return await republish(topic, subscription, list);
    },
    async republishPreconditionFail(topic, subscription, limit = Number.MAX_SAFE_INTEGER) {
        const list = await store.getPreconditionFailEvent(topic, subscription, limit);

        if (isDebug()) {
            debug("REPUBLISH PRECONDITION FAIL", { topic, subscription, count: list.length });
        }

        return await republish(topic, subscription, list);
    },
    async republishPreconditionFailWithDelay() {
        const list = await store.getPreconditionFailEventWithDelay();

        if (isDebug()) {
            debug("REPUBLISH PRECONDITION FAIL DELAY");
        }

        for (let index in list) {
            const { topic, subscription, eventList } = list[index];
            await republish(topic, subscription, eventList);
        }

        return list;
    },
    async republishSingleError(topic, subscription, events) {
        const list = await store.getEventFromList(events);

        if (isDebug()) {
            debug("REPUBLISH SINGLE ERROR", { topic, subscription, events });
        }

        await republish(topic, subscription, list);
    }
};
