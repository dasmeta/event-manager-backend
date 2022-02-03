'use strict';


module.exports = {


  async find(ctx) {
    const list = await strapi.services['event'].getStats();

    ctx.send(list);
  },

  async getHistoryByEvents(cxt) {
    const {where, skip, limit} = cxt.request.body;
    const {entity, entityId, ...queryParams} = JSON.parse(where);
    console.log(entity, entityId, skip, limit, queryParams);
    const result = await strapi.services['event'].getEvents(entity, entityId, queryParams, skip, limit);

    cxt.send(result);
  },

  async getError(cxt) {
    const {topic, subscription} = cxt.request.body;
    const list = await strapi.services['event'].getErrors(topic, subscription);

    cxt.send(list);
  },

  async getEvent(cxt) {
    const {eventId} = cxt.request.body;
    const event = await strapi.services['event'].getEventById(eventId);

    cxt.send(event);
  },

  async updateEvent(cxt) {
    const {eventId, data} = cxt.request.body;
    const event = await strapi.services['event'].updateEventById(eventId, data);

    cxt.send(event);
  },

  async calculateStats(cxt) {
    await strapi.services['event'].calculateStats();

    cxt.send();
  },

  async calculateSingleStats(cxt) {
    const {topic, subscription} = cxt.request.body;
    await strapi.services['event'].calculateSingleStats(topic, subscription);

    cxt.send();
  },

  async republishError(cxt) {
    const {topic, subscription, limit} = cxt.request.body;
    await strapi.services['event'].republishError(topic, subscription, parseInt(limit));
    // await strapi.services['event'].calculateStats();

    cxt.send();
  },
  async republishFail(cxt) {
    const {topic, subscription, limit} = cxt.request.body;
    await strapi.services['event'].republishFail(topic, subscription, parseInt(limit));
    // await strapi.services['event'].calculateStats();

    cxt.send();
  },

  async republishPreconditionFail(cxt) {
    const {topic, subscription, limit} = cxt.request.body;
    await strapi.services['event'].republishPreconditionFail(topic, subscription, parseInt(limit));
    // await strapi.services['event'].calculateStats();

    cxt.send();
  },

  async republishSingleError(cxt) {
    const {topic, subscription, events} = cxt.request.body;
    await strapi.services['event'].republishSingleError(topic, subscription, events);
    // await strapi.services['event'].calculateStats();

    cxt.send();
  },

  async cleanAnomaly(cxt) {
    const {topic, subscription} = cxt.request.body;
    await strapi.services['event'].cleanAnomaly(topic, subscription);
    // await strapi.services['event'].calculateStats();

    cxt.send();
  },

  async populateMissing(cxt) {
    const {topic, subscription, as} = cxt.request.body;
    await strapi.services['event'].populateMissing(topic, subscription, as);
    // await strapi.services['event'].calculateStats();

    cxt.send();
  },

  async markMissingAsError(cxt) {
    const {topic, subscription} = cxt.request.body;
    await strapi.services['event'].markMissingAsError(topic, subscription);

    cxt.send();
  },

  async markAsFail(cxt) {
    const {topic, subscription, start, end} = cxt.request.body;
    await strapi.services['event'].markAsFail(topic, subscription, new Date(start), new Date(end));
    // await strapi.services['event'].calculateStats();

    cxt.send();
  },

  async markAsSuccess(cxt) {
    const {topic, subscription, type} = cxt.request.body;
    await strapi.services['event'].markAsSuccess(topic, subscription, type);
    await strapi.services['event'].calculateSingleStats(topic, subscription);

    cxt.send();
  },

  async markSingleAsSuccess(cxt) {
    const {topic, subscription, events} = cxt.request.body;
    await strapi.services['event'].markSingleAsSuccess(topic, subscription, events);
    await strapi.services['event'].calculateSingleStats(topic, subscription);

    cxt.send();
  },

};
