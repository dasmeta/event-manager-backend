'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {

    async getErrors(ctx) {
        const {topic, subscription} = ctx.request.query;
        const start = parseInt(ctx.request.query._start || 0, 10);
        const limit = parseInt(ctx.request.query._limit || 5, 10);
        const list = await strapi.services['event-subscription'].getErrors(topic, subscription, start, limit);
    
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
        await strapi.services['event-stats'].calculateSingle(topic, subscription);
    
        ctx.send({});
    },

    async markSingleAsSuccess(ctx) {
        const {topic, subscription, events} = ctx.request.body;
        await strapi.services['event-subscription'].markSingleAsSuccess(topic, subscription, events);
        await strapi.services['event-stats'].calculateSingle(topic, subscription);

        ctx.send({});
    },

    async recordStart(ctx) {
        const {topic, subscription, eventId, traceId} = ctx.request.body;
        await strapi.services['event-subscription'].recordStart(topic, subscription, eventId, traceId);

        ctx.send({});
    },

    async recordSuccess(ctx) {
        const {topic, subscription, eventId, traceId} = ctx.request.body;
        await strapi.services['event-subscription'].recordSuccess(topic, subscription, eventId, traceId);

        ctx.send({});
    },

    async recordFailure(ctx) {
        const {topic, subscription, eventId, traceId, error} = ctx.request.body;
        await strapi.services['event-subscription'].recordFailure(topic, subscription, eventId, traceId, error);

        ctx.send({});
    },

    async recordPreconditionFailure(ctx) {
        const {topic, subscription, eventId, traceId} = ctx.request.body;
        await strapi.services['event-subscription'].recordPreconditionFailure(topic, subscription, eventId, traceId);

        ctx.send({});
    },

    async hasReachedMaxAttempts(ctx) {
        const {topic, subscription, eventId, maxAttempts} = ctx.request.query;
        const result = await strapi.services['event-subscription'].hasReachedMaxAttempts(topic, subscription, eventId, maxAttempts);

        ctx.send({ result });
    },
};
