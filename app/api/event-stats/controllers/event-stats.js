'use strict';

const { runBulk } = require('../../../helper/sse');

module.exports = {
    async calculate(ctx) {
        await runBulk(ctx, 'event-stats:calculate', (opts) =>
            strapi.services['event-stats'].calculate(opts)
        );
    },
    async calculateSingle(ctx) {
        const {topic, subscription} = ctx.request.body;
        await runBulk(ctx, `calculateSingle:${topic}:${subscription}`, (opts) =>
            strapi.services['event-stats'].calculateSingle(topic, subscription, opts)
        );
    },
};
