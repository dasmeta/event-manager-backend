// const {
//   getStats,
//   getEvents,
//   calculateStats,
//   calculateSingleStats,
//   republishError,
//   republishFail,
//   republishPreconditionFail,
//   republishSingleError,
//   getErrors,
//   getEventById,
//   updateEventById,
//   cleanAnomaly,
//   populateMissing,
//   markMissingAsError,
//   markAsFail,
//   markAsSuccess,
//   markSingleAsSuccess,
// } = require("@dasmeta/event-manager-node-api");

module.exports = {

  async getStats() {
    return getStats();
  },

  async getEvents() {
    return getEvents();
  },

  async getErrors(topic, subscription) {
    return getErrors(topic, subscription);
  },

  async getEventById(eventId) {
    return getEventById(eventId);
  },

  async updateEventById(eventId, data) {
    return updateEventById(eventId, data);
  },

  async calculateStats() {
    return calculateStats();
  },

  async calculateSingleStats(topic, subscription) {
    return calculateSingleStats(topic, subscription);
  },

  async republishError(topic, subscription, limit) {
    return republishError(topic, subscription, limit);
  },

  async republishFail(topic, subscription, limit) {
    return republishFail(topic, subscription, limit);
  },

  async republishPreconditionFail(topic, subscription, limit) {
    return republishPreconditionFail(topic, subscription, limit);
  },

  async republishSingleError(topic, subscription, events) {
    return republishSingleError(topic, subscription, events);
  },

  async cleanAnomaly(topic, subscription) {
    return cleanAnomaly(topic, subscription);
  },

  async populateMissing(topic, subscription, as) {
    return populateMissing(topic, subscription, as);
  },

  async markMissingAsError(topic, subscription) {
    return markMissingAsError(topic, subscription);
  },

  async markAsFail(topic, subscription, start, end) {
    return markAsFail(topic, subscription, start, end);
  },

  async markAsSuccess(topic, subscription, type) {
    return markAsSuccess(topic, subscription, type);
  },

  async markSingleAsSuccess(topic, subscription, events) {
    return markSingleAsSuccess(topic, subscription, events);
  },

};

