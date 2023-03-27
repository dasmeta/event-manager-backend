'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

const { dbClientFactory } = require("../../../helper/dbAdapter/dbClientFactory");
const store = dbClientFactory.createClient();

module.exports = {
    async calculate() {

        if(!process.env.USE_OLD_CALCULATE) {

            const limit = 10;
            let start = 0;
            let index = 0;

            const count = await strapi.query('event-stats').count();

            while(start <= count) {
                const stats = await strapi.query('event-stats').find({_limit: 10, _start: start});
                await Promise.all(stats.map(item => {
                    strapi.log.debug(`##### - ${++index} - #####`);
                    strapi.log.debug(`${item.topic} - ${item.subscription}`);
                    return this.calculateSingle(item.topic, item.subscription);
                }));
                start += limit;
            }
            return;
        }

        // TODO for backward compatibility (maybe remove in future)
        const eventData = await store.getGroupedEvents();
        const subscriptionData = await store.getGroupedSubscriptions();

        const eventCountMapping = {};
        eventData.forEach(item => {
            const { _id: topic, total } = item;
            eventCountMapping[topic] = total;
        });

        const bulk = subscriptionData.map(item => {
            const {
                _id: { topic, subscription },
                count,
                success,
                error,
                preconditionFail,
            } = item;
            const total = eventCountMapping[topic];
            const missing = Math.max(total - count, 0);
            const fail = count - success - error - preconditionFail;

            return store.createOrUpdateStats(
                topic, 
                subscription,
                {
                    topicCount: total,
                    subscriptionCount: count,
                    total,
                    success,
                    error,
                    preconditionFail,
                    fail,
                    missing,
                }
            );
        });
        await Promise.all(bulk);
    },

    async calculateSingle(topic, subscription) {
        const total = await strapi.query('event').count({ topic });

        const subscriptionData = await store.getGroupedSubscriptionsForSingleTopic(topic, subscription);

        const { count = 0, success = 0, error = 0, preconditionFail = 0 } = subscriptionData[0] || {};
        const missing = Math.max(total - count, 0);
        const fail = count - success - error - preconditionFail;

        return store.createOrUpdateStats(
            topic, 
            subscription,
            {
                topicCount: total,
                subscriptionCount: count,
                total,
                success,
                error,
                preconditionFail,
                fail,
                missing,
            },
        );
    }
};
