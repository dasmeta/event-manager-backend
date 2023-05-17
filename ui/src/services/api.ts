import { EventApiFactory, EventSubscriptionApiFactory, EventStatsApiFactory } from "@dasmeta/event-manager-node-api";

const eventApi = EventApiFactory({
  baseOptions: {
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('jwt')}`
    }
  }
}, CONFIG.BASEPATH);
const eventSubscriptionApi = EventSubscriptionApiFactory({
  baseOptions: {
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('jwt')}`
    }
  }
}, CONFIG.BASEPATH);
const eventStatsApi = EventStatsApiFactory({
  baseOptions: {
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('jwt')}`
    }
  }
}, CONFIG.BASEPATH);

export {
  eventApi,
  eventSubscriptionApi,
  eventStatsApi
};
