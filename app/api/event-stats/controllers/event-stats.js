'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async calculate(ctx) {
        await strapi.services['event-stats'].calculate();
        ctx.send();
    },
    async calculateSingle(ctx) {
        const {topic, subscription} = ctx.request.body;
        await strapi.services['event-stats'].calculateSingle(topic, subscription);
    
        ctx.send();
    },
};
