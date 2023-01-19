import { EventApiFactory, EventSubscriptionApiFactory, EventStatsApiFactory } from "@dasmeta/event-manager-node-api";

const eventApi = EventApiFactory(undefined, CONFIG.BASEPATH);
const eventSubscriptionApi = EventSubscriptionApiFactory(undefined, CONFIG.BASEPATH);
const eventStatsApi = EventStatsApiFactory(undefined, CONFIG.BASEPATH);

export {
  eventApi,
  eventSubscriptionApi,
  eventStatsApi
};
