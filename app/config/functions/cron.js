'use strict';
const moment = require("moment");
const { dbClientFactory } = require("../../helper/dbAdapter/dbClientFactory");
const store = dbClientFactory.createClient();

/**
 * Cron config that gives you an opportunity
 * to run scheduled jobs.
 *
 * The cron format consists of:
 * [SECOND (optional)] [MINUTE] [HOUR] [DAY OF MONTH] [MONTH OF YEAR] [DAY OF WEEK]
 *
 * See more details here: https://strapi.io/documentation/developer-docs/latest/setup-deployment-guides/configurations.html#cron-tasks
 */

module.exports = {
  /**
   * Simple example.
   * Every monday at 1am.
   */
  // '0 1 * * 1': () => {
  //
  // }

  '0 * * * *': async () => {

    if(!process.env.DATA_RETENTION_DAYS || !process.env.DATA_CLEANUP_HOUR) {
      console.log('NO RETENTION DAYS OT CLEANUP HOUR IS SET');
      return;
    }

    const retentionDays = process.env.DATA_RETENTION_DAYS;
    const cleanupTime = process.env.DATA_CLEANUP_HOUR;

    const retentionDate = moment().subtract(retentionDays, 'days').toDate().getTime();

    const now = moment();
    const startTimeNow = now.format('HH');

    if(startTimeNow !== cleanupTime) {
      console.log('NOT CORRECT TIME. SKIPPING.');
      return;
    }

    const lastEvent = await store.getFirstSubscription();
    const lastEventDate = moment(lastEvent.createdAt).toDate().getTime();

    let start = lastEventDate;
    let end = Math.min(retentionDate, moment(start).add(30, 'days').toDate().getTime());

    while(start < end) {
      console.log(`ARCHIVING EVENTS FROM ${moment(start).format('YYYY-MM-DD HH:mm:ss')} - TO ${moment(end).format('YYYY-MM-DD HH:mm:ss')}`);

      const eventIds = await store.getEventsToRemove(start, end);

      await store.archiveData(eventIds);

      start = moment(start).add(30, 'days').toDate().getTime();
      end = Math.min(retentionDate, moment(start).add(30, 'days').toDate().getTime());
    }

    

  }
};
