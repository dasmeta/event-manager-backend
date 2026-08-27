'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

const { logger } = require("@dasmeta/event-manager-utils");
const { dbClientFactory } = require("../../../helper/dbAdapter/dbClientFactory");
const { isCancelled, reportProgress } = require("../../../helper/sse");
const store = dbClientFactory.createClient();

module.exports = {
    async getErrors(topic, subscription, start = 0, limit = 5) {
        return store.getErrors(topic, subscription, start, limit);
    },

    async cleanAnomaly(topic, subscription, opts = {}) {
        if (isCancelled(opts)) {
            return;
        }
        const result = await store.removeUnnecessarySubscriptions(topic, subscription);
        return result;
    },

    async populateMissing(topic, subscription, as = "fail", opts = {}) {
        const missingEvents = await store.getMissingEvents(topic, subscription);
        const missingEventIds = missingEvents.map(o => o._id ? o._id.eventId.toString() : o.id);
    
        const events = (await store.getExistingEvents(missingEventIds)).map(item => item._id ? item._id.toString() : item.id);
    
        let insertCount = 0;
        const total = events.length;
        for (const eventId of events) {
            if (isCancelled(opts)) {
                return {
                    insertCount,
                    eventCount: missingEvents.length,
                };
            }

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
            reportProgress(opts, { done: insertCount, total });
        }
        return {
            insertCount,
            eventCount: missingEvents.length,
        };
    },

    async markMissingAsError(topic, subscription, opts = {}) {

        if (logger.isDebug()) {
            logger.debug("MARK MISSING AS ERROR START SLOW RUNNING...", { topic, subscription });
        }

        const limit = 10000;
        let insertCount = 0;
        let processed = 0;
        const total = Number(await strapi.query('event').count({ topic })) || 0;
        reportProgress(opts, { done: 0, total });
        for (let i = 0; i <= 1000; i++) {
            if (isCancelled(opts)) {
                return { insertCount };
            }
            if (logger.isDebug()) {
                logger.debug(`Iteration ${i}`, { topic, subscription });
            }

            const events = await store.getEventsByTopic(topic, i * limit, limit);
            const eventIds = events.map(item => item._id || item.id);

            if (events.length === 0) {
                break;
            }

            const eventSubscriptions = (await store.getEventsWithSubscription(subscription, eventIds))
            .reduce((acc, item) => {
                acc[item] = true
                return acc;
            }, {});

            for (const eventId of eventIds) {
                if (isCancelled(opts)) {
                    return { insertCount };
                }
                if (eventSubscriptions[eventId.toString()]) {
                    processed++;
                    continue;
                }

                insertCount++;
                processed++;
                await store.createOrUpdateSubscription({
                        eventId,
                        topic,
                        subscription,
                    },
                    {
                        isSuccess: false,
                        isError: true,
                        isPreconditionFail: false,
                        error: {
                            stack: 'No stack available',
                            message: 'Marked as error from missing'
                        }
                    }
                )

                if (logger.isDebug()) {
                    logger.debug(`Inserted Record:`, { topic, subscription, eventId });
                }
            }
            reportProgress(opts, { done: processed, total });
        }

        if (logger.isDebug()) {
            logger.debug(`Inserted Count: ${insertCount}`, { topic, subscription });
        }

        return {
            insertCount
        };
    },

    async markAsFail(topic, subscription, start, end, opts = {}) {
        if (isCancelled(opts)) {
            return;
        }
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

    async markAsSuccess(topic, subscription, type, opts = {}) {
        if (isCancelled(opts)) {
            return;
        }
        await store.updateSubscriptionByType(
            topic,
            subscription,
            type,
            {
                isSuccess: true,
                isError: false,
                isPreconditionFail: false
                // isManuallyFixed: true
            }
        )
    },

    async markSingleAsSuccess(topic, subscription, events, message, opts = {}) {
        if (isCancelled(opts)) {
            return;
        }
        await store.updateSubscriptionByEvents(
            topic,
            subscription,
            events,
            message,
            {
                isSuccess: true,
                isError: false,
                isPreconditionFail: false,
                // isManuallyFixed: true
            }
        );
    },

    async recordStart(topic, subscription, eventId, traceId) {
        return store.recordStart(topic, subscription, eventId, traceId);
    },

    async recordSuccess(topic, subscription, eventId, traceId) {
        return store.recordSuccess(topic, subscription, eventId, traceId);
    },

    async recordFailure(topic, subscription, eventId, traceId, error) {
        return store.recordFailure(topic, subscription, eventId, traceId, error);
    },

    async recordPreconditionFailure(topic, subscription, eventId, traceId) {
        return store.recordPreconditionFailure(topic, subscription, eventId, traceId);
    },

    async hasReachedMaxAttempts(topic, subscription, eventId, maxAttempts = 5) {
        return store.hasReachedMaxAttempts(topic, subscription, eventId, maxAttempts);
    }
};
