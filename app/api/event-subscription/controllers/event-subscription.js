'use strict';

const { runBulk } = require('../../../helper/sse');

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
        await runBulk(ctx, `cleanAnomaly:${topic}:${subscription}`, (opts) =>
            strapi.services['event-subscription'].cleanAnomaly(topic, subscription, opts)
        );
    },

    async populateMissing(ctx) {
        const {topic, subscription, as} = ctx.request.body;
        await runBulk(ctx, `populateMissing:${topic}:${subscription}`, (opts) =>
            strapi.services['event-subscription'].populateMissing(topic, subscription, as, opts)
        );
    },

    async markMissingAsError(ctx) {
        const {topic, subscription} = ctx.request.body;
        await runBulk(ctx, `markMissingAsError:${topic}:${subscription}`, (opts) =>
            strapi.services['event-subscription'].markMissingAsError(topic, subscription, opts)
        );
    },

    async markAsFail(ctx) {
        const {topic, subscription, start, end} = ctx.request.body;
        await runBulk(ctx, `markAsFail:${topic}:${subscription}`, (opts) =>
            strapi.services['event-subscription'].markAsFail(topic, subscription, new Date(start), new Date(end), opts)
        );
    },

    async markAsSuccess(ctx) {
        const {topic, subscription, type} = ctx.request.body;
        await runBulk(ctx, `markAsSuccess:${topic}:${subscription}`, async (opts) => {
            await strapi.services['event-subscription'].markAsSuccess(topic, subscription, type, opts);
            await strapi.services['event-stats'].calculateSingle(topic, subscription, opts);
        });
    },

    async markSingleAsSuccess(ctx) {
        const {topic, subscription, events, message} = ctx.request.body;
        await runBulk(ctx, `markSingleAsSuccess:${topic}:${subscription}`, async (opts) => {
            await strapi.services['event-subscription'].markSingleAsSuccess(topic, subscription, events, message, opts);
            await strapi.services['event-stats'].calculateSingle(topic, subscription, opts);
        });
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
