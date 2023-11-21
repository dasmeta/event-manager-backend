const { ObjectId } = require("mongodb");

class client {
    async getErrors(topic, subscription) {
        return strapi.query('event-subscription').model
            .aggregate([
                {
                    $match: {
                        topic,
                        subscription,
                        isError: true,
                    },
                },
                {
                    $sort: { updatedAt: -1 }
                },
                {
                    $group: {
                        _id: "$error.message",
                        count: {$sum: 1},
                        error: {$first: "$error"},
                        eventIds: {$addToSet: "$eventId"},
                    },
                },
            ]);
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
            ]);
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
            ]);
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
            ]);
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
            .select({ eventId: 1 })
            .limit(limit);

        const ids = eventIdList.map(item => item.eventId);
        return strapi.query('event').model
            .find({ _id: { $in: ids } })
            .sort({ createdAt: 1 });
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
            .select({ eventId: 1 })
            .limit(limit);

        const ids = eventIdList.map(item => item.eventId);
        return strapi.query('event').model
            .find({ _id: { $in: ids } })
            .sort({ createdAt: 1 });
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
            .select({ eventId: 1 })
            .limit(limit);

        const ids = eventIdList.map(item => item.eventId);
        return strapi.query('event').model
            .find({ _id: { $in: ids } })
            .sort({ createdAt: 1 });
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
            ]);
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
            ]);
    }

    async removeUnnecessarySubscriptions(topic, subscription) {
        const list = await this.getSubscriptionsWithoutEvents(topic, subscription);
    
        const duplicates = await this.getDuplicateSubscriptions(topic, subscription);
    
        const bulk = strapi.query('event-subscription').model.collection.initializeOrderedBulkOp();
        list.forEach(item => {
            bulk.find({ _id: item._id }).remove();
        });
        duplicates.forEach(item => {
            const eventId = item._id;
            const createdAts = item.createdAts.map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
            createdAts.pop();
            createdAts.forEach(createdAt => {
                bulk.find({ eventId, createdAt }).remove();
            });
        });
        if (bulk.length) {
            await bulk.execute();
        }
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
            ])
            .allowDiskUse(true);
    }

    async getExistingEvents(ids) {
        return strapi.query('event').model
            .find({ _id: ids })
            .select({ _id: 1 });
    }

    async getEventsByIds(ids) {
        return strapi.query('event').model
            .find({ _id: ids })
            .sort({ createdAt: 1});
    }

    async getEventsByTopic(topic, start, limit) {
        return strapi.query('event').model
            .find({ topic })
            .select({ _id: 1 })
            .skip(start)
            .limit(limit);
    }

    async getEventsWithSubscription(subscription, eventIds) {
        return strapi.query('event-subscription').model.distinct("eventId", {
            subscription,
            eventId: { $in: eventIds }
        });
    }

    async createOrUpdateSubscription(condition, data) {
        return strapi.query('event-subscription').model.update(
            condition,
            {
                "$setOnInsert": {
                    ...condition,
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

    async recordStart(topic, subscription, eventId, traceId) {
        return strapi.query('event-subscription').model.findOneAndUpdate(
            {
                eventId: ObjectId(eventId),
                subscription,
            },
            {
                $setOnInsert: {
                    createdAt: new Date(),
                    eventId: ObjectId(eventId),
                    topic,
                    subscription,
                },
                $set: {
                    traceId,
                    isSuccess: false,
                    isError: false,
                    isPreconditionFail: false,
                    updatedAt: new Date(),
                },
            },
            { upsert: true }
        );
    }

    async recordSuccess(topic, subscription, eventId, traceId) {
        return strapi.query('event-subscription').model.updateOne(
            {
                eventId: ObjectId(eventId),
                subscription,
            },
            {
                $set: {
                    eventId: ObjectId(eventId),
                    topic,
                    subscription,
                    traceId,
                    isSuccess: true,
                    isError: false,
                    isPreconditionFail: false,
                    updatedAt: new Date(),
                },
            },
            { upsert: true }
        );
    }

    async recordFailure(topic, subscription, eventId, traceId, error) {

        const errObject = Object.getOwnPropertyNames(error).reduce((acc, key) => {
            acc[key] = error[key];
            return acc;
        }, {});

        return strapi.query('event-subscription').model.updateOne(
            {
                eventId: ObjectId(eventId),
                subscription,
            },
            {
                $set: {
                    eventId: ObjectId(eventId),
                    topic,
                    subscription,
                    traceId,
                    isSuccess: false,
                    isError: true,
                    isPreconditionFail: false,
                    error: errObject,
                    updatedAt: new Date(),
                },
            },
            { upsert: true }
        );
    }

    async recordPreconditionFailure(topic, subscription, eventId, traceId) {

        return strapi.query('event-subscription').model.updateOne(
            {
                eventId: ObjectId(eventId),
                subscription,
            },
            {
                $set: {
                    eventId: ObjectId(eventId),
                    topic,
                    subscription,
                    traceId,
                    isSuccess: false,
                    isError: false,
                    isPreconditionFail: true,
                    updatedAt: new Date(),
                },
            },
            { upsert: true }
        );
    }

    async hasReachedMaxAttempts(topic, subscription, eventId, maxAttempts = 5) {

        const events = await strapi.query('event-subscription').model.find(
            {
                eventId: ObjectId(eventId),
                subscription,
                topic,
                attempts: { $gt: parseInt(maxAttempts) }
            });

        return !!events.length;
    }

    async getTopicList() {
        return strapi.query('event').model.distinct("topic");
    }

    async getSubscriptionListByTopic(topic) {
        return strapi.query('event-subscription').model.distinct("subscription", { topic });
    }

    async getFirstSubscription() {
        const data = await strapi.query('event-subscription').model.find({}).limit(1).sort({ createdAt: 1 });
        return data[0];
    }

    async getEventsToRemove(start, end) {
        if(!start || !end) {
            return [];
        }
        const data = await strapi.query('event-subscription').model
            .aggregate([
                {
                    $match: {
                        createdAt: {
                            $lt: new Date(end),
                            $gte: new Date(start)
                        }
                    },
                },
                {
                    $sort: { updatedAt: -1 }
                },
                {
                    $group: {
                        _id: "$eventId",
                        total: { $sum: 1 },
                        succeededCount: {
                         $sum: { $cond: [{ $eq: ["$isSuccess", true] }, 1, 0] }
                       }
                    }
                },
                {
                    $match: {
                        $expr: { $eq: ["$total", "$succeededCount"] }
                    }
                }
            ]);

            return data.map(item => item._id);
    }

    async archiveData(eventIds = []) {
        const events = await strapi.query('event').model.find({ _id: eventIds });
        const subscriptions = await strapi.query('event-subscription').model.find({ eventId: eventIds });

        await strapi.query('event-archive').model.insertMany(events);
        await strapi.query('event-subscription-archive').model.insertMany(subscriptions);

        await strapi.query('event').model.deleteMany({ _id: eventIds });
        await strapi.query('event-subscription').model.deleteMany({ eventId: eventIds });
    }
}

module.exports = {
    client
}