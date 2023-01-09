const { ObjectId } = require("mongodb");

class client {
    async getErrors(topic, subscription) {
        return await strapi.query('event-subscription').model
            .aggregate([
                {
                    $match: {
                        topic,
                        subscription,
                        isError: true,
                    },
                },
                {
                    $group: {
                        _id: "$error.message",
                        count: {$sum: 1},
                        error: {$first: "$error"},
                        eventIds: {$addToSet: "$eventId"},
                    },
                },
            ])
            .toArray();
    }

    async getGroupedEvents() {
        return strapi.query('event').model
            .aggregate([
                {
                    $group: {
                        _id: "$topic",
                        total: { $sum: 1 },
                    },
                },
            ])
            .toArray();
    }

    async getGroupedSubscriptions() {
        return strapi.query('event-subscription').model
            .aggregate([
                {
                    $group: {
                        _id: {
                            topic: "$topic",
                            subscription: "$subscription",
                        },
                        count: { $sum: 1 },
                        success: { $sum: { $cond: ["$isSuccess", 1, 0] } },
                        error: { $sum: { $cond: ["$isError", 1, 0] } },
                        preconditionFail: { $sum: { $cond: ["$isPreconditionFail", 1, 0] } },
                    },
                },
            ])
            .toArray();
    }

    async getGroupedSubscriptionsForSingleTopic(topic, subscription) {
        return strapi.query('event-subscription').model
            .aggregate([
                {
                    $match: {
                        topic,
                        subscription
                    }
                },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        success: { $sum: { $cond: ["$isSuccess", 1, 0] } },
                        error: { $sum: { $cond: ["$isError", 1, 0] } },
                        preconditionFail: { $sum: { $cond: ["$isPreconditionFail", 1, 0] } },
                    },
                },
            ]).toArray();
    }

    async createOrUpdateStats(topic, subscription, data) {
        return strapi.query('event-stats').model.updateOne(
            { topic, subscription },
            {
                $set: {
                    topic,
                    subscription,
                    ...data
                },
            },
            { upsert: true }
        );
    }

    async getErrorEvents(topic, subscription, limit) {
        const eventIdList = await strapi.query('event-subscription').model
            .find({
                topic,
                subscription,
                isError: true,
                isPreconditionFail: false,
                isSuccess: false,
            })
            .sort({ createdAt: 1 })
            .project({ eventId: 1 })
            .limit(limit)
            .toArray();

        const ids = eventIdList.map(item => item.eventId);
        return strapi.query('event').model
            .find({ _id: { $in: ids } })
            .sort({ createdAt: 1 })
            .toArray();
    }

    async getFailEvents(topic, subscription, limit) {
        const eventIdList = await strapi.query('event-subscription').model
            .find({
                topic,
                subscription,
                isError: false,
                isPreconditionFail: false,
                isSuccess: false,
            })
            .sort({ createdAt: 1 })
            .project({ eventId: 1 })
            .limit(limit)
            .toArray();

        const ids = eventIdList.map(item => item.eventId);
        return strapi.query('event').model
            .find({ _id: { $in: ids } })
            .sort({ createdAt: 1 })
            .toArray();
    }

    async getPreconditionFailEvents(topic, subscription, limit = Number.MAX_SAFE_INTEGER) {
        const eventIdList = await strapi.query('event-subscription').model
            .find({
                topic,
                subscription,
                isError: false,
                isPreconditionFail: true,
                isSuccess: false
            })
            .sort({ createdAt: 1 })
            .project({ eventId: 1 })
            .limit(limit)
            .toArray();

        const ids = eventIdList.map(item => item.eventId);
        return strapi.query('event').model
            .find({ _id: { $in: ids } })
            .sort({ createdAt: 1 })
            .toArray();
    }

    async getSubscriptionsWithoutEvents(topic, subscription) {
        return strapi.query('event-subscription').model
            .aggregate([
                {
                    $match: {
                        topic,
                        subscription,
                    },
                },
                {
                    $lookup: {
                        from: "event",
                        localField: "eventId",
                        foreignField: "_id",
                        as: "event",
                    },
                },
                {
                    $match: {
                        event: [],
                        topic,
                        subscription,
                    },
                },
                {
                    $project: {
                        _id: 1,
                    },
                },
            ])
            .toArray();
    }

    async getDuplicateSubscriptions(topic, subscription) {
        return strapi.query('event-subscription').model
            .aggregate([
                {
                    $match: {
                        topic,
                        subscription,
                    },
                },
                {
                    $group: {
                        _id: "$eventId",
                        count: { $sum: 1 },
                        createdAts: { $addToSet: "$createdAt" },
                    },
                },
                { $match: { count: { $gt: 1 } } },
            ])
            .toArray();
    }

    async getMissingEvents(topic, subscription) {
        return strapi.query('event-subscription').model
            .aggregate([
                {
                    $match: {
                        topic
                    }
                },
                {
                    $group: {
                        _id: { eventId: "$eventId" },
                        subscriptions: { $push: "$subscription" }
                    }
                },
                {
                    $match: {
                        "subscriptions": {
                            $nin: [subscription]
                        }
                    }
                }
            ],
                {
                    allowDiskUse: true
                }
            )
            .toArray();
    }

    async getExistingEvents(ids) {
        return strapi.query('event').model
            .find({ id: ids })
            .project({ _id: 1 })
            .toArray();
    }

    async getEventsByTopic(topic, start, limit) {
        return strapi.query('event').model
            .find({ topic })
            .project({ _id: 1 })
            .skip(start)
            .limit(limit)
            .toArray();
    }

    async getEventsWithSubscription(subscription, eventIds) {
        return strapi.query('event-subscription').model.distinct("eventId", {
            subscription,
            eventId: { $in: eventIds }
        });
    }

    async createOrUpdateSubscription(eventId, topic, subscription, data) {
        return strapi.query('event-subscription').model.update(
            {
                eventId,
                topic,
                subscription
            },
            {
                "$setOnInsert": {
                    eventId,
                    topic,
                    subscription,
                    ...data
                }
            },
            {
                upsert: true
            }
        )
    }

    async updateSubscriptionByDate(topic, subscription, start, end, data) {
        return strapi.query('event-subscription').model.updateMany(
            {
                topic,
                subscription,
                createdAt: { $gte: start, $lte: end },
            },
            {
                $set: data,
            }
        );
    }

    async updateSubscriptionByType(topic, subscription, type, data) {
        return strapi.query('event-subscription').model.updateMany(
            {
                topic,
                subscription,
                isSuccess: false,
                isError: type === "error",
                isPreconditionFail: type === "preconditionFail"
            },
            {
                $set: data
            }
        );
    }

    async updateSubscriptionByEvents(topic, subscription, eventIds, data) {
        return strapi.query('event-subscription').model.updateMany(
            {
                topic,
                subscription,
                eventId: { $in: eventIds.map(item => ObjectId(item)) }
            },
            {
                $set: data
            }
        );
    }
}

module.exports = {
    client
}