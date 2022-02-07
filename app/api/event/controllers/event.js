'use strict';


module.exports = {


  async find(ctx) {
    const list = await strapi.services['event'].getStats();

    ctx.send(list);
  },

  async getHistoryByEvents(ctx) {
    const {where, skip, limit} = ctx.request.query;
    const {entity, entityId, ...queryParams} = JSON.parse(where);
    console.log(entity, entityId, skip, limit, queryParams);
    const result = await strapi.services['event'].getEvents(entity, entityId, queryParams, skip, limit);

    ctx.send(result);
  },

  async getError(ctx) {
    const {topic, subscription} = ctx.request.query;
    const list = await strapi.services['event'].getErrors(topic, subscription);

    ctx.send(list);
  },

  async getEvent(ctx) {
    const {eventId} = ctx.request.query;
    const event = await strapi.services['event'].getEventById(eventId);

    ctx.send(event);
  },

  async updateEvent(ctx) {
    const {eventId, data} = ctx.request.body;
    const event = await strapi.services['event'].updateEventById(eventId, data);

    ctx.send(event);
  },

  async calculateStats(ctx) {
    await strapi.services['event'].calculateStats();

    ctx.send();
  },

  async calculateSingleStats(ctx) {
    const {topic, subscription} = ctx.request.body;
    await strapi.services['event'].calculateSingleStats(topic, subscription);

    ctx.send();
  },

  async republishError(ctx) {
    const {topic, subscription, limit} = ctx.request.body;
    await strapi.services['event'].republishError(topic, subscription, parseInt(limit));
    // await strapi.services['event'].calculateStats();

    ctx.send();
  },
  async republishFail(ctx) {
    const {topic, subscription, limit} = ctx.request.body;
    await strapi.services['event'].republishFail(topic, subscription, parseInt(limit));
    // await strapi.services['event'].calculateStats();

    ctx.send();
  },

  async republishPreconditionFail(ctx) {
    const {topic, subscription, limit} = ctx.request.body;
    await strapi.services['event'].republishPreconditionFail(topic, subscription, parseInt(limit));
    // await strapi.services['event'].calculateStats();

    ctx.send();
  },

  async republishSingleError(ctx) {
    const {topic, subscription, events} = ctx.request.body;
    await strapi.services['event'].republishSingleError(topic, subscription, events);
    // await strapi.services['event'].calculateStats();

    ctx.send();
  },

  async cleanAnomaly(ctx) {
    const {topic, subscription} = ctx.request.body;
    await strapi.services['event'].cleanAnomaly(topic, subscription);
    // await strapi.services['event'].calculateStats();

    ctx.send();
  },

  async populateMissing(ctx) {
    const {topic, subscription, as} = ctx.request.body;
    await strapi.services['event'].populateMissing(topic, subscription, as);
    // await strapi.services['event'].calculateStats();

    ctx.send();
  },

  async markMissingAsError(ctx) {
    const {topic, subscription} = ctx.request.body;
    await strapi.services['event'].markMissingAsError(topic, subscription);

    ctx.send();
  },

  async markAsFail(ctx) {
    const {topic, subscription, start, end} = ctx.request.body;
    await strapi.services['event'].markAsFail(topic, subscription, new Date(start), new Date(end));
    // await strapi.services['event'].calculateStats();

    ctx.send();
  },

  async markAsSuccess(ctx) {
    const {topic, subscription, type} = ctx.request.body;
    await strapi.services['event'].markAsSuccess(topic, subscription, type);
    await strapi.services['event'].calculateSingleStats(topic, subscription);

    ctx.send();
  },

  async markSingleAsSuccess(ctx) {
    const {topic, subscription, events} = ctx.request.body;
    await strapi.services['event'].markSingleAsSuccess(topic, subscription, events);
    await strapi.services['event'].calculateSingleStats(topic, subscription);

    ctx.send();
  },

};
