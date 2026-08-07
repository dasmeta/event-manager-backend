'use strict';

const { dbClientFactory } = require('../../helper/dbAdapter/dbClientFactory');

const ZERO_STATS = {
  error: 0,
  fail: 0,
  missing: 0,
  success: 0,
  preconditionFail: 0,
  subscriptionCount: 0,
  topicCount: 0,
  total: 0,
};

function pairKey(topic, subscription) {
  return `${topic}::${subscription}`;
}

function pairsFromEnv() {
  const raw = process.env.EVENT_STATS_SEED_PAIRS;
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      strapi.log.warn('EVENT_STATS_SEED_PAIRS must be a JSON array');
      return [];
    }
    return parsed
      .filter((item) => item && item.topic && item.subscription)
      .map((item) => ({ topic: item.topic, subscription: item.subscription }));
  } catch (err) {
    strapi.log.warn(`EVENT_STATS_SEED_PAIRS is invalid JSON: ${err.message}`);
    return [];
  }
}

async function pairsFromSubscriptions() {
  const store = dbClientFactory.createClient();
  const grouped = await store.getGroupedSubscriptions();
  return (grouped || [])
    .map((item) => item && item._id)
    .filter((id) => id && id.topic && id.subscription)
    .map((id) => ({ topic: id.topic, subscription: id.subscription }));
}

/**
 * Ensures event-stats rows exist (all counts 0) so the UI list is visible.
 * Does not recalculate — use Calculate / Calculate single in the UI for that.
 */
async function seedEventStatsRows() {
  const fromSubs = await pairsFromSubscriptions();
  const fromEnv = pairsFromEnv();

  const byKey = new Map();
  for (const pair of [...fromSubs, ...fromEnv]) {
    byKey.set(pairKey(pair.topic, pair.subscription), pair);
  }

  const pairs = Array.from(byKey.values());
  if (!pairs.length) {
    strapi.log.info(
      'seedEventStats: no topic/subscription pairs found (event_subscription empty and EVENT_STATS_SEED_PAIRS unset)'
    );
    return { total: 0, created: 0 };
  }

  const existing = await strapi.query('event-stats').find({ _limit: -1 });
  const existingKeys = new Set(
    (existing || []).map((row) => pairKey(row.topic, row.subscription))
  );

  let created = 0;
  for (const { topic, subscription } of pairs) {
    if (existingKeys.has(pairKey(topic, subscription))) {
      continue;
    }

    await strapi.query('event-stats').create({
      topic,
      subscription,
      ...ZERO_STATS,
    });
    created += 1;
  }

  strapi.log.info(`seedEventStats: done. total pairs=${pairs.length} created=${created}`);
  return { total: pairs.length, created };
}

function seedEventStatsInBackground() {
  // On by default; set SEED_EVENT_STATS_ON_START=false to disable
  if (process.env.SEED_EVENT_STATS_ON_START === 'false') {
    return;
  }

  setImmediate(() => {
    seedEventStatsRows().catch((err) => {
      strapi.log.warn(`seedEventStats failed: ${err.message}`);
    });
  });
}

module.exports = {
  ZERO_STATS,
  seedEventStatsRows,
  seedEventStatsInBackground,
};
