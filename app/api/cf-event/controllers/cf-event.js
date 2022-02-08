'use strict';


module.exports = {
  async find(ctx) {
    const list = await strapi.services['cf-event'].getStats();

    ctx.send(list);
  },

  async getHistoryByEvents(ctx) {
    const {where, skip, limit} = ctx.request.query;
    const {entity, entityId, ...queryParams} = JSON.parse(where);
    console.log(entity, entityId, skip, limit, queryParams);
    const result = await strapi.services['cf-event'].getEvents(entity, entityId, queryParams, skip, limit);

    ctx.send(result);
  },

  async getError(ctx) {
    const {topic, subscription} = ctx.request.query;
    const list = await strapi.services['cf-event'].getErrors(topic, subscription);

    ctx.send(list);
  },

  async getEvent(ctx) {
    const {eventId} = ctx.request.query;
    const event = await strapi.services['cf-event'].getEventById(eventId);

    ctx.send(event);
  },

  async updateEvent(ctx) {
    const {eventId, data} = ctx.request.body;
    const event = await strapi.services['cf-event'].updateEventById(eventId, data);

    ctx.send(event);
  },

  async calculateStats(ctx) {
    await strapi.services['cf-event'].calculateStats();

    ctx.send();
  },

  async calculateSingleStats(ctx) {
    const {topic, subscription} = ctx.request.body;
    await strapi.services['cf-event'].calculateSingleStats(topic, subscription);

    ctx.send();
  },

  async republishError(ctx) {
    const {topic, subscription, limit} = ctx.request.body;
    await strapi.services['cf-event'].republishError(topic, subscription, parseInt(limit));
    // await strapi.services['cf-event'].calculateStats();

    ctx.send();
  },
  async republishFail(ctx) {
    const {topic, subscription, limit} = ctx.request.body;
    await strapi.services['cf-event'].republishFail(topic, subscription, parseInt(limit));
    // await strapi.services['cf-event'].calculateStats();

    ctx.send();
  },

  async republishPreconditionFail(ctx) {
    const {topic, subscription, limit} = ctx.request.body;
    await strapi.services['cf-event'].republishPreconditionFail(topic, subscription, parseInt(limit));
    // await strapi.services['cf-event'].calculateStats();

    ctx.send();
  },

  async republishSingleError(ctx) {
    const {topic, subscription, events} = ctx.request.body;
    await strapi.services['cf-event'].republishSingleError(topic, subscription, events);
    // await strapi.services['cf-event'].calculateStats();

    ctx.send();
  },

  async cleanAnomaly(ctx) {
    const {topic, subscription} = ctx.request.body;
    await strapi.services['cf-event'].cleanAnomaly(topic, subscription);
    // await strapi.services['cf-event'].calculateStats();

    ctx.send();
  },

  async populateMissing(ctx) {
    const {topic, subscription, as} = ctx.request.body;
    await strapi.services['cf-event'].populateMissing(topic, subscription, as);
    // await strapi.services['cf-event'].calculateStats();

    ctx.send();
  },

  async markMissingAsError(ctx) {
    const {topic, subscription} = ctx.request.body;
    await strapi.services['cf-event'].markMissingAsError(topic, subscription);

    ctx.send();
  },

  async markAsFail(ctx) {
    const {topic, subscription, start, end} = ctx.request.body;
    await strapi.services['cf-event'].markAsFail(topic, subscription, new Date(start), new Date(end));
    // await strapi.services['cf-event'].calculateStats();

    ctx.send();
  },

  async markAsSuccess(ctx) {
    const {topic, subscription, type} = ctx.request.body;
    await strapi.services['cf-event'].markAsSuccess(topic, subscription, type);
    await strapi.services['cf-event'].calculateSingleStats(topic, subscription);

    ctx.send();
  },

  async markSingleAsSuccess(ctx) {
    const {topic, subscription, events} = ctx.request.body;
    await strapi.services['cf-event'].markSingleAsSuccess(topic, subscription, events);
    await strapi.services['cf-event'].calculateSingleStats(topic, subscription);

    ctx.send();
  },

};
