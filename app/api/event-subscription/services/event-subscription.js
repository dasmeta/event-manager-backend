'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

const { dbClientFactory } = require("../../../helper/dbAdapter/dbClientFactory");
const { getSubscription } = require("../../../helper/pubsub");
const logger = require("../../../helper/utils/logger");
const bugsnag = require("../../../helper/utils/bugsnag");
const store = dbClientFactory.createClient();

const subscriptionHandler = (topic, subscription, handler, maxAttempts = 5) => async subscriptionObject => {
    const onMessage = message => {
        const { eventId, traceId, data, subscription: eventSubscription = "", dataSource } = JSON.parse(message.data.toString());
        const context = { topic, subscription, traceId, dataSource };

        if (logger.isDebug()) {
            logger.debug(`RECEIVE eventId: ${eventId}, topic: ${topic}, subscription: ${subscription}`);
        }
        if (eventSubscription && subscription !== eventSubscription) {
            if (logger.isDebug()) {
                logger.debug(`SKIP event subscription: "${eventSubscription}", current subscription: ${subscription}`);
            }
            message.ack();
            return;
        }
        const fulfilled = async () => {
            if (logger.isDebug() && eventId) {
                logger.timeEnd(`EXEC eventId: ${eventId}, topic: ${topic}, subscription: ${subscription}`);
            }
            if (logger.isDebug()) {
                logger.debug("EXEC SUCCESS");
            }
            if (eventId) {
                await store.recordSuccess(topic, subscription, eventId, traceId);
            }
            if (logger.isDebug()) {
                logger.debug(`ACK Before eventId: ${eventId}, topic: ${topic}, subscription: ${subscription}`);
            }
            message.ack();

            if (logger.isDebug()) {
                logger.debug(
                    `ACK After. Subscription Collection updated eventId: ${eventId}, topic: ${topic}, subscription: ${subscription}`
                );
            }
        };
        const rejected = async err => {
            logger.error("HANDLE ERROR", err, { topic, subscription, data, eventId });
            bugsnag.notify(err, { topic, subscription, data, eventId });
            if (logger.isDebug() && eventId) {
                logger.timeEnd(`EXEC eventId: ${eventId}, topic: ${topic}, subscription: ${subscription}`);
            }
            if (logger.isDebug()) {
                logger.error("EXEC FAIL", { topic, subscription });
            }

            if (eventId) {
                if (err.message.includes("PreconditionFailedError")) {
                    if ((await store.hasReachedMaxAttempts(topic, subscription, eventId, maxAttempts))) {
                        await store.recordFailure(topic, subscription, eventId, traceId, err);
                    } else {
                        await store.recordPreconditionFailure(topic, subscription, eventId, traceId);
                    }
                } else {
                    await store.recordFailure(topic, subscription, eventId, traceId, err);
                }
            }
            if (logger.isDebug()) {
                logger.debug("Subscription Collection updated");
            }
            if (! err.message.includes("PreconditionFailedError")) {
                message.ack();
            }
        };

        if (logger.isDebug() && eventId) {
            logger.timeStart(`EXEC eventId: ${eventId}, topic: ${topic}, subscription: ${subscription}`);
        }
        if (eventId) {
            store
                .recordStart(topic, subscription, eventId)
                .then(() => {
                    handler(data, context).then(fulfilled, rejected);
                })
                .catch(err => {
                    logger.error("ERROR: Can not store record start, it is probably issue with mongodb", err);
                    bugsnag.notify(err, { topic, subscription, eventId });
                });
        } else {
            handler(data, context).then(fulfilled, rejected);
        }
    };

    const onError = err => {
        logger.error("SUBSCRIPTION ERROR", err, { topic, subscription });
        bugsnag.notify(err, { topic, subscription });
        // process.exit(1);
    };

    subscriptionObject.onMessage = onMessage;
    subscriptionObject.onError = onError;
    subscriptionObject.on("message", onMessage);
    subscriptionObject.on("error", onError);
};

module.exports = {

    async getErrors(topic, subscription) {
        return store.getErrors(topic, subscription);
    },

    async cleanAnomaly(topic, subscription) {
        const list = await store.getSubscriptionsWithoutEvents(topic, subscription);
    
        const duplicates = await store.getDuplicateSubscriptions(topic, subscription);
    
        const bulk = strapi.query('event-subscription').model.collection.initializeOrderedBulkOp();
        list.forEach(item => {
            bulk.find({ _id: item._id }).remove();
        });
        duplicates.forEach(item => {
            const eventId = item._id;
            const createdAts = item.createdAts.map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
            createdAts.pop();
            createdAts.forEach(createdAt => {
                bulk.find({ eventId, createdAt }).remove();
            });
        });
        if (bulk.length) {
            await bulk.execute();
        }
    },

    async populateMissing(topic, subscription, as = "fail") {
        const missingEvents = await store.getMissingEvents(topic, subscription);
        const missingEventIds = missingEvents.map(o => o._id.eventId.toString());
    
        const events = (await store.getExistingEvents(missingEventIds)).map(item => item._id.toString());
    
        let insertCount = 0;
        for (const eventId of events) {
    
            const insertData = {
                eventId,
                topic,
                subscription,
                isSuccess: as === "success",
                isError: as === "error",
                isPreconditionFail: false
            }
    
            if(as === 'error') {
                insertData.error = {
                    stack: 'No stack available',
                    message: 'Marked as error from missing'
                }
            }
    
            insertCount++;
            
            await strapi.query('event-subscription').create(insertData);
        }
        return {
            insertCount,
            eventCount: missingEvents.length,
        };
    },

    async markMissingAsError(topic, subscription) {

        if (isDebug()) {
            debug("MARK MISSING AS ERROR START SLOW RUNNING...", { topic, subscription });
        }

        const limit = 10000;
        let insertCount = 0;
        for (let i = 0; i <= 1000; i++) {
            if (isDebug()) {
                debug(`Iteration ${i}`, { topic, subscription });
            }

            const events = await store.getEventsByTopic(topic, i * limit, limit);
            const eventIds = events.map(item => item._id);

            if (events.length === 0) {
                break;
            }

            const eventSubscriptions = (await store.getEventsWithSubscription(subscription, eventIds))
            .reduce((acc, item) => {
                acc[item] = true
                return acc;
            }, {});

            for (const eventId of eventIds) {
                if (eventSubscriptions[eventId.toString()]) {
                    continue;
                }

                insertCount++;
                await store.createOrUpdateSubscription(
                    eventId,
                    topic,
                    subscription,
                    {
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        isSuccess: false,
                        isError: true,
                        isPreconditionFail: false,
                        error: {
                            stack: 'No stack available',
                            message: 'Marked as error from missing'
                        }
                    }
                )

                if (isDebug()) {
                    debug(`Inserted Record:`, { topic, subscription, eventId });
                }
            }
        }

        if (isDebug()) {
            debug(`Inserted Count: ${insertCount}`, { topic, subscription });
        }

        return {
            insertCount
        };
    },

    async markAsFail(topic, subscription, start, end) {

        await store.updateSubscriptionByDate(
            topic,
            subscription,
            start,
            end,
            {
                isSuccess: false,
                isError: false,
                isPreconditionFail: false
            }
        );
    },

    async markAsSuccess(topic, subscription, type) {

        await store.updateSubscriptionByType(
            topic,
            subscription,
            type,
            {
                isSuccess: true,
                isError: false,
                isPreconditionFail: false,
                isManuallyFixed: true
            }
        )
    },

    async markSingleAsSuccess(topic, subscription, events) {

        await store.updateSubscriptionByEvents(
            topic,
            subscription,
            events,
            {
                isSuccess: true,
                isError: false,
                isPreconditionFail: false,
                isManuallyFixed: true
            }
        );
    },

    async register(topic, subscription, handler, maxAttempts) {
        try {
            const subscriptionObject = await getSubscription(topic, subscription);
            const sHandler = subscriptionHandler(topic, subscription, handler, maxAttempts);
            await sHandler(subscriptionObject);

        } catch (err) {
            logger.error(`GET "${subscription}" SUBSCRIPTION ERROR`, err, { topic, subscription });
            bugsnag.notify(err, { topic, subscription });
            process.exit(1);
        }
    }
};
