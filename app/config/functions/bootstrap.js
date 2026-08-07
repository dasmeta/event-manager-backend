'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * See more details here: https://strapi.io/documentation/developer-docs/latest/setup-deployment-guides/configurations.html#bootstrap
 */

const { dbClientFactory } = require('../../helper/dbAdapter/dbClientFactory');
const { ensureAuthenticatedPermissions } = require('./ensurePermissions');
const { seedEventStatsInBackground } = require('./seedEventStats');

module.exports = async () => {
  try {
    const store = dbClientFactory.createClient();
    if (typeof store.ensureIndexes === 'function') {
      await store.ensureIndexes();
      strapi.log.info('Database indexes ensured');
    }
  } catch (err) {
    strapi.log.warn(`ensureIndexes failed: ${err.message}`);
  }

  try {
    await ensureAuthenticatedPermissions();
    strapi.log.info('API permissions ensured');
  } catch (err) {
    strapi.log.warn(`ensurePermissions failed: ${err.message}`);
  }

  // Non-blocking: create missing event-stats rows with zeros (UI list only)
  seedEventStatsInBackground();
};
