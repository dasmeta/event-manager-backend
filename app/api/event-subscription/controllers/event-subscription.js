'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {

    async getErrors(ctx) {
        const {topic, subscription} = ctx.request.query;
        const list = await strapi.services['event-subscription'].getErrors(topic, subscription);
    
        ctx.send(list);
    },

    async cleanAnomaly(ctx) {
        const {topic, subscription} = ctx.request.body;
        await strapi.services['event-subscription'].cleanAnomaly(topic, subscription);
        // await strapi.services['event-stats'].calculateStats();
    
        ctx.send({});
    },

    async populateMissing(ctx) {
        const {topic, subscription, as} = ctx.request.body;
        await strapi.services['event-subscription'].populateMissing(topic, subscription, as);
        // await strapi.services['event-stats'].calculateStats();
    
        ctx.send({});
    },

    async markMissingAsError(ctx) {
        const {topic, subscription} = ctx.request.body;
        await strapi.services['event-subscription'].markMissingAsError(topic, subscription);
    
        ctx.send({});
    },

    async markAsFail(ctx) {
        const {topic, subscription, start, end} = ctx.request.body;
        await strapi.services['event-subscription'].markAsFail(topic, subscription, new Date(start), new Date(end));
        // await strapi.services['event-stats'].calculateStats();
    
        ctx.send({});
    },

    async markAsSuccess(ctx) {
        const {topic, subscription, type} = ctx.request.body;
        await strapi.services['event-subscription'].markAsSuccess(topic, subscription, type);
        await strapi.services['event-stats'].calculateSingleStats(topic, subscription);
    
        ctx.send({});
    },

    async markSingleAsSuccess(ctx) {
        const {topic, subscription, events} = ctx.request.body;
        await strapi.services['event-subscription'].markSingleAsSuccess(topic, subscription, events);
        await strapi.services['event-stats'].calculateSingleStats(topic, subscription);

        ctx.send({});
    },

    async register(ctx) {
        const {topic, subscription, handler, maxAttempts} = ctx.request.body;
        await strapi.services['event-subscription'].register(topic, subscription, new Function("return " + handler), maxAttempts);

        ctx.send({});
    }
};
