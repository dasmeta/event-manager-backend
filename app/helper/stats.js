const store = require("./helper/store");

module.exports = {
    async calculateStats() {
        return await store.calculateEventStats();
    },
    async calculateSingleStats(topic, subscription) {
        return await store.calculateSingleEventStats(topic, subscription);
    },
    async getStats() {
        return await store.getEventStats();
    },
    async getEvents(entity, entityId, params, skip, limit) {
        return await store.getEvents(entity, entityId, params, skip, limit);
    },
    async getErrors(topic, subscription) {
        return await store.getErrors(topic, subscription);
    },
    async getEventById(eventId) {
        return await store.getEventById(eventId);
    },
    async updateEventById(eventId, data) {
        return await store.updateEventById(eventId, data);
    },
    async cleanAnomaly(topic, subscription) {
        return await store.cleanAnomaly(topic, subscription);
    },
    async populateMissing(topic, subscription, as) {
        return await store.populateMissing(topic, subscription, as);
    },
    async markMissingAsError(topic, subscription) {
        return await store.markMissingAsError(topic, subscription);
    },
    async markAsFail(topic, subscription, start, end) {
        return await store.markAsFail(topic, subscription, start, end);
    },
    async markAsSuccess(topic, subscription, type) {
        return await store.markAsSuccess(topic, subscription, type);
    },
    async markSingleAsSuccess(topic, subscription, events) {
        return await store.markSingleAsSuccess(topic, subscription, events);
    },
};
