'use strict';

const axios = require("axios");
const apiUrl = process.env.CF_CRM_API_URL || 'https://crm.tutor.berlin/api';
const apiKey = process.env.CF_CRM_API_KEY || 'a4b9ab77-671b-4ff9-b908-0b82fe244dc3';
const params = { token: apiKey };

async function getStats() {
  return (await axios.get(`${apiUrl}/event/stats`, { params } )).data;
}

async function getErrors(topic, subscription) {
  return (await axios.get(`${apiUrl}/event/errors`, { params: { ...params, topic, subscription } })).data;
}

async function getEventById(eventId) {
  return (await axios.get(`${apiUrl}/event/${eventId}`, { params })).data;
}

async function updateEventById(eventId, data) {
  return (await axios.put(`${apiUrl}/event/${eventId}`, data, { params })).data;
}

async function calculateStats() {
  return (await axios.post(`${apiUrl}/event/calculate-stats`, null, { params })).data;
}

async function calculateSingleStats(topic, subscription) {
  return (await axios.post(`${apiUrl}/event/calculate-single-stats`, { topic, subscription }, { params })).data;
}

async function republishError(topic, subscription, limit) {
  return (await axios.post(`${apiUrl}/event/republish-error`, { topic, subscription, limit }, { params })).data;
}

async function republishFail(topic, subscription, limit) {
  return (await axios.post(`${apiUrl}/event/republish-fail`, { topic, subscription, limit }, { params })).data;
}

async function republishPreconditionFail(topic, subscription, limit) {
  return (await axios.post(`${apiUrl}/event/republish-precondition-fail`, { topic, subscription, limit }, { params })).data;
}

async function republishSingleError(topic, subscription, events) {
  return (await axios.post(`${apiUrl}/event/republish-single-error`, { topic, subscription, events }, { params })).data;
}

async function cleanAnomaly(topic, subscription) {
  return (await axios.post(`${apiUrl}/event/clean-anomaly`, { topic, subscription }, { params })).data;
}

async function populateMissing(topic, subscription, as) {
  return (await axios.post(`${apiUrl}/event/populate-missing`, { topic, subscription, as }, { params })).data;
}

async function markMissingAsError(topic, subscription) {
  return (await axios.post(`${apiUrl}/event/mark-missing-as-error`, { topic, subscription }, { params })).data;
}

async function markAsFail(topic, subscription, start, end) {
  return (await axios.post(`${apiUrl}/event/mark-as-fail`, { topic, subscription, start, end }, { params })).data;
}

async function markAsSuccess(topic, subscription, type) {
  return (await axios.post(`${apiUrl}/event/mark-as-success`, { topic, subscription, type }, { params })).data;
}

async function markSingleAsSuccess(topic, subscription, events) {
  return (await axios.post(`${apiUrl}/event/mark-single-as-success`, { topic, subscription, events }, { params })).data;
}

module.exports = {
  getStats,
  getErrors,
  getEventById,
  updateEventById,
  calculateStats,
  calculateSingleStats,
  republishError,
  republishFail,
  republishPreconditionFail,
  republishSingleError,
  cleanAnomaly,
  populateMissing,
  markMissingAsError,
  markAsFail,
  markAsSuccess,
  markSingleAsSuccess
};
