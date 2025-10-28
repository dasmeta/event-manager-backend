'use strict';

module.exports = {

  async authenticated(ctx) {
    ctx.send({});
  },

  async publish(ctx) {
    const {topic, data, dataSource, traceId, entityProps} = ctx.request.body;
    await strapi.services['event'].publish(topic, data, dataSource, traceId, entityProps);
  
    ctx.send({})
  },

  async nonPersistentPublish(ctx) {
    const {topic, data} = ctx.request.body;
    await strapi.services['event'].nonPersistentPublish(topic, data);

    ctx.send({})
  },

  // use GET /event-stats?_sort=topic:asc&_sort=subscription:asc
  // async find(ctx) {
  //   const list = await strapi.services['event'].getStats();

  //   ctx.send(list);
  // },


  // use GET /events?entity=value&entityId=value&_limit=10&_start=0
  // use GET /events/count?entity=value&entityId=value
  // async getHistoryByEvents(ctx) {
  //   const {where, skip, limit} = ctx.request.query;
  //   const {entity, entityId, ...queryParams} = JSON.parse(where);

  //   strapi.log.debug(entity, entityId, skip, limit, queryParams);
  //   const result = await strapi.services['event'].getEvents(entity, entityId, queryParams, skip, limit);

  //   ctx.send(result);
  // },

  // use GET /event-subscriptions/errors
  // async getError(ctx) {
  //   const {topic, subscription} = ctx.request.query;
  //   const list = await strapi.services['event'].getErrors(topic, subscription);

  //   ctx.send(list);
  // },

  // use GET /events/:id
  // async getEvent(ctx) {
  //   const {eventId} = ctx.request.query;
  //   const event = await strapi.services['event'].getEventById(eventId);

  //   ctx.send(event);
  // },

  // use PUT /events/:id
  // async updateEvent(ctx) {
  //   const {eventId, data} = ctx.request.body;
  //   const event = await strapi.services['event'].updateEventById(eventId, data);

  //   ctx.send(event);
  // },

  // use POST /event-stats/calculate
  // async calculateStats(ctx) {
  //   await strapi.services['event'].calculateStats();

  //   ctx.send();
  // },

  // use POST /event-stats/calculate-single
  // async calculateSingleStats(ctx) {
  //   const {topic, subscription} = ctx.request.body;
  //   await strapi.services['event'].calculateSingleStats(topic, subscription);

  //   ctx.send();
  // },

  async republishError(ctx) {
    const {topic, subscription, limit} = ctx.request.body;
    await strapi.services['event'].republishError(topic, subscription, limit);
    // await strapi.services['event-stats'].calculate();

    ctx.send();
  },
  async republishFail(ctx) {
    const {topic, subscription, limit} = ctx.request.body;
    await strapi.services['event'].republishFail(topic, subscription, limit);
    // await strapi.services['event-stats'].calculate();

    ctx.send();
  },

  async republishPreconditionFail(ctx) {
    const {topic, subscription, limit} = ctx.request.body;
    await strapi.services['event'].republishPreconditionFail(topic, subscription, limit);
    // await strapi.services['event'].calculateStats();

    ctx.send();
  },

  async republishSingleError(ctx) {
    const {topic, subscription, events} = ctx.request.body;
    await strapi.services['event'].republishSingleError(topic, subscription, events);
    // await strapi.services['event'].calculateStats();

    ctx.send();
  },

  // use POST /event-subscription/clean-anomaly
  // async cleanAnomaly(ctx) {
  //   const {topic, subscription} = ctx.request.body;
  //   await strapi.services['event'].cleanAnomaly(topic, subscription);
  //   // await strapi.services['event'].calculateStats();

  //   ctx.send();
  // },

  // use POST /event-subscription/populate-missing
  // async populateMissing(ctx) {
  //   const {topic, subscription, as} = ctx.request.body;
  //   await strapi.services['event'].populateMissing(topic, subscription, as);
  //   // await strapi.services['event'].calculateStats();

  //   ctx.send();
  // },

  // use POST /event-subscription/mark-missing-as-error
  // async markMissingAsError(ctx) {
  //   const {topic, subscription} = ctx.request.body;
  //   await strapi.services['event'].markMissingAsError(topic, subscription);

  //   ctx.send();
  // },

  // use POST /event-subscription/mark-as-fail
  // async markAsFail(ctx) {
  //   const {topic, subscription, start, end} = ctx.request.body;
  //   await strapi.services['event'].markAsFail(topic, subscription, new Date(start), new Date(end));
  //   // await strapi.services['event'].calculateStats();

  //   ctx.send();
  // },

  // use POST /event-subscription/mark-as-success
  // async markAsSuccess(ctx) {
  //   const {topic, subscription, type} = ctx.request.body;
  //   await strapi.services['event'].markAsSuccess(topic, subscription, type);
  //   await strapi.services['event'].calculateSingleStats(topic, subscription);

  //   ctx.send();
  // },

  // use POST /event-subscription/mark-single-as-success
  // async markSingleAsSuccess(ctx) {
  //   const {topic, subscription, events} = ctx.request.body;
  //   await strapi.services['event'].markSingleAsSuccess(topic, subscription, events);
  //   await strapi.services['event'].calculateSingleStats(topic, subscription);

  //   ctx.send();
  // },

};
