const { ObjectId } = require("mongodb");
const { isDebug, debug } = require("./logger");
const { getCollection } = require("./connection");

module.exports = {
    async getEvents(entity, entityId, params, skip, limit) {
        if (!entity || !entityId) {
            return { data: [], total: 0 }
        }

        const { date = [], ...condition } = params

        if (!!params.date && params.date.length) {
            condition.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) }
        }

        const eventCollection = await getCollection("event");
        const data = await eventCollection
            .find({ entity, entityId, ...condition })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit || 10))
            .skip(parseInt(skip || 0))
            .toArray();
        const total = await eventCollection.countDocuments({ entity, entityId, ...condition });

        return { total, data }
    },

    async createEvent(topic, traceId, data, dataSource, entityProps) {
        const collection = await getCollection("event");
        const now = new Date();

        const body = {
            traceId,
            topic,
            data,
            dataSource,
            createdAt: now,
            updatedAt: now,
        };

        if (entityProps.entity && entityProps.entityId) {
            body.entity = entityProps.entity;
            body.entityId = entityProps.entityId;
        }

        const eventDoc = await collection.insertOne(body, {
            writeConcern: { w: 1, j: true }
        });

        return eventDoc.insertedId.toString();
    },

    async updateEvent(eventId, data) {
        const collection = await getCollection("event");
        const updatedAt = new Date();

        await collection.updateOne(
            { _id: ObjectId(eventId) },
            {
                $set: {
                    ...data,
                    updatedAt,
                },
            }
        );
    },

    async recordStart({ topic, subscription, eventId, traceId }) {
        const collection = await getCollection("event_subscription");

        const ObjectEventId = new ObjectId(eventId);

        await collection.findOneAndUpdate(
            {
                eventId: ObjectEventId,
                subscription,
            },
            {
                $setOnInsert: {
                    createdAt: new Date(),
                    eventId: ObjectEventId,
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
    },

    async recordSuccess({ topic, subscription, eventId, traceId }) {
        const collection = await getCollection("event_subscription");

        const ObjectEventId = new ObjectId(eventId);

        await collection.updateOne(
            {
                eventId: ObjectEventId,
                subscription,
            },
            {
                $set: {
                    eventId: ObjectEventId,
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
    },

    async recordFailure({ topic, subscription, eventId, traceId, error }) {
        const collection = await getCollection("event_subscription");

        const ObjectEventId = new ObjectId(eventId);

        const errObject = Object.getOwnPropertyNames(error).reduce((acc, key) => {
            acc[key] = error[key];
            return acc;
        }, {});

        await collection.updateOne(
            {
                eventId: ObjectEventId,
                subscription,
            },
            {
                $set: {
                    eventId: ObjectEventId,
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
    },

    async recordPreconditionFailure({ topic, subscription, eventId, traceId }) {
        const collection = await getCollection("event_subscription");

        const ObjectEventId = new ObjectId(eventId);

        await collection.updateOne(
            {
                eventId: ObjectEventId,
                subscription,
            },
            {
                $set: {
                    eventId: ObjectEventId,
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
    },

    async hasReachedMaxAttempts({ topic, subscription, eventId, maxAttempts = 5 }) {
        const collection = await getCollection("event_subscription");

        const ObjectEventId = new ObjectId(eventId);

        const events = await collection.find(
            {
                eventId: ObjectEventId,
                subscription,
                topic,
                attempts: { $gt: parseInt(maxAttempts) }
            }).toArray();

        return !!events.length;
    },

    async calculateEventStats() {
        const eventCollection = await getCollection("event");
        const subscriptionCollection = await getCollection("event_subscription");
        const statsCollection = await getCollection("event_stats");

        const eventData = await eventCollection
            .aggregate([
                {
                    $group: {
                        _id: "$topic",
                        total: { $sum: 1 },
                    },
                },
            ])
            .toArray();

        const subscriptionData = await subscriptionCollection
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

        const eventCountMapping = {};
        eventData.forEach(item => {
            const { _id: topic, total } = item;
            eventCountMapping[topic] = total;
        });

        const bulk = subscriptionData.map(item => {
            const {
                _id: { topic, subscription },
                count,
                success,
                error,
                preconditionFail,
            } = item;
            const total = eventCountMapping[topic];
            const missing = Math.max(total - count, 0);
            const fail = count - success - error - preconditionFail;

            return statsCollection.updateOne(
                { topic, subscription },
                {
                    $set: {
                        topic,
                        subscription,
                        topicCount: total,
                        subscriptionCount: count,
                        total,
                        success,
                        error,
                        preconditionFail,
                        fail,
                        missing,
                    },
                },
                { upsert: true }
            );
        });
        await Promise.all(bulk);
    },
    async calculateSingleEventStats(topic, subscription) {
        const eventCollection = await getCollection("event");
        const subscriptionCollection = await getCollection("event_subscription");
        const statsCollection = await getCollection("event_stats");

        const total = await eventCollection
            .find({ topic })
            .count();

        const subscriptionData = await subscriptionCollection
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

        const { count, success, error, preconditionFail } = subscriptionData[0];
        const missing = Math.max(total - count, 0);
        const fail = count - success - error - preconditionFail;

        return statsCollection.updateOne(
            { topic, subscription },
            {
                $set: {
                    topic,
                    subscription,
                    topicCount: total,
                    subscriptionCount: count,
                    total,
                    success,
                    error,
                    preconditionFail,
                    fail,
                    missing,
                },
            },
            { upsert: true }
        );
    },
    async getEventStats() {
        const statsCollection = await getCollection("event_stats");
        return statsCollection
            .find({})
            .sort({ topic: 1, subscription: 1 })
            .toArray();
    },
    async getFailEvent(topic, subscription, limit = Number.MAX_SAFE_INTEGER) {
        const subscriptionCollection = await getCollection("event_subscription");
        const eventCollection = await getCollection("event");

        const eventIdList = await subscriptionCollection
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
        return eventCollection
            .find({ _id: { $in: ids } })
            .sort({ createdAt: 1 })
            .toArray();
    },
    async getErrorEvent(topic, subscription, limit = Number.MAX_SAFE_INTEGER) {
        const subscriptionCollection = await getCollection("event_subscription");
        const eventCollection = await getCollection("event");

        const eventIdList = await subscriptionCollection
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
        return eventCollection
            .find({ _id: { $in: ids } })
            .sort({ createdAt: 1 })
            .toArray();
    },
    async getEventFromList(events) {
        const eventCollection = await getCollection("event");

        const ids = events.map(item => ObjectId(item));
        return eventCollection
            .find({ _id: { $in: ids } })
            .sort({ createdAt: 1 })
            .toArray();
    },
    async getPreconditionFailEvent(topic, subscription, limit = Number.MAX_SAFE_INTEGER) {
        const subscriptionCollection = await getCollection("event_subscription");
        const eventCollection = await getCollection("event");

        const eventIdList = await subscriptionCollection
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
        return eventCollection
            .find({ _id: { $in: ids } })
            .sort({ createdAt: 1 })
            .toArray();
    },
    async getPreconditionFailEventWithDelay() {
        const subscriptionCollection = await getCollection("event_subscription");
        const eventCollection = await getCollection("event");

        const eventList = await subscriptionCollection
            .find({ isPreconditionFail: true })
            .sort({ createdAt: 1 })
            .project({ eventId: 1, topic: 1, subscription: 1 })
            .toArray();

        const ids = eventList.map(item => item._id);

        const events = {};
        eventList.forEach(item => {
            const key = `${item.topic}_${item.subscription}`;
            if (!events[key]) {
                events[key] = { topic: item.topic, subscription: item.subscription, eventIds: [item.eventId] };
            } else {
                events[key].eventIds.push(item.eventId);
            }
        });

        const eventKeys = Object.keys(events);
        for (let index of eventKeys) {
            const eventIds = events[index].eventIds;
            events[index].eventList = await eventCollection
                .find({ _id: { $in: eventIds } })
                .sort({ createdAt: 1 })
                .toArray();
            delete events[index].eventIds;
        }

        await subscriptionCollection
            .updateMany(
                { _id: { $in: ids } },
                {
                    $inc: {
                        attempts: 1
                    }
                }
            );

        return events;
    },
    async getErrors(topic, subscription) {
        const subscriptionCollection = await getCollection("event_subscription");

        return await subscriptionCollection
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
    },
    async getEventById(eventId) {
        const eventCollection = await getCollection("event");

        return await eventCollection.findOne({ _id: ObjectId(eventId) });
    },
    async updateEventById(eventId, data) {
        const eventCollection = await getCollection("event");

        await eventCollection.updateOne(
            {
                _id: ObjectId(eventId)
            },
            {
                $set: {
                    data,
                    updatedAt: new Date()
                },
            }
        );

        return await eventCollection.findOne({ _id: ObjectId(eventId) });
    },
    async cleanAnomaly(topic, subscription) {
        const subscriptionCollection = await getCollection("event_subscription");
        const list = await subscriptionCollection
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

        const duplicates = await subscriptionCollection
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

        const bulk = subscriptionCollection.initializeOrderedBulkOp();
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
    },
    async populateMissing(topic, subscription, as = "fail") {
        const eventCollection = await getCollection("event");
        const subscriptionCollection = await getCollection("event_subscription");

        const missingEvents = (await subscriptionCollection.aggregate([
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
            .toArray()).map(o => o._id.eventId.toString());

        const events = (await eventCollection
            .find({ id: missingEvents })
            .project({ _id: 1 })
            .toArray()).map(item => item._id.toString());

        let insertCount = 0;
        for (const eventId of events) {

            const insertData = {
                eventId,
                topic,
                subscription,
                createdAt: new Date(),
                updatedAt: new Date(),
                isSuccess: as === "success",
                isError: as === "error",
                isPreconditionFail: false
            }

            if(as === 'error') {
                insertData.error = {
                    stack: 'No stack available',
                    message: 'Marked as error from missing'
                }
            }

            insertCount++;
            
            await subscriptionCollection.insertOne(insertData);
        }
        return {
            insertCount,
            eventCount: missingEvents.length,
        };
    },
    async markMissingAsError(topic, subscription) {

        if (isDebug()) {
            debug("MARK MISSING AS ERROR START SLOW RUNNING...", { topic, subscription });
        }

        const eventCollection = await getCollection("event");
        const subscriptionCollection = await getCollection("event_subscription");

        const limit = 10000;
        let insertCount = 0;
        for (let i = 0; i <= 1000; i++) {
            if (isDebug()) {
                debug(`Iteration ${i}`, { topic, subscription });
            }
            const events = (await eventCollection.find({
                topic
            }, { _id: 1 })
                .skip(i * limit)
                .limit(limit)
                .toArray()).map(item => item._id);

            if (events.length === 0) {
                break;
            }

            const eventSubscriptions = (await subscriptionCollection.distinct("eventId", {
                subscription,
                eventId: { $in: events }
            })).reduce((acc, item) => {
                acc[item] = true
                return acc;
            }, {});

            for (const eventId of events) {
                if (eventSubscriptions[eventId.toString()]) {
                    continue;
                }

                insertCount++;
                await subscriptionCollection.update(
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
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            isSuccess: false,
                            isError: true,
                            isPreconditionFail: false,
                            error: {
                                stack: 'No stack available',
                                message: 'Marked as error from missing'
                            }
                        }
                    },
                    {
                        upsert: true
                    }
                )

                if (isDebug()) {
                    debug(`Inserted Record:`, { topic, subscription, eventId });
                }
            }
        }

        if (isDebug()) {
            debug(`Inserted Count: ${insertCount}`, { topic, subscription });
        }

        return {
            insertCount
        };
    },
    async markAsFail(topic, subscription, start, end) {
        const subscriptionCollection = await getCollection("event_subscription");

        await subscriptionCollection.updateMany(
            {
                topic,
                subscription,
                createdAt: { $gte: start, $lte: end },
            },
            {
                $set: {
                    isSuccess: false,
                    isError: false,
                    isPreconditionFail: false
                },
            }
        );
    },
    async markAsSuccess(topic, subscription, type) {
        const subscriptionCollection = await getCollection("event_subscription");

        await subscriptionCollection.updateMany(
            {
                topic,
                subscription,
                isSuccess: false,
                isError: type === "error",
                isPreconditionFail: type === "preconditionFail"
            },
            {
                $set: {
                    isSuccess: true,
                    isError: false,
                    isPreconditionFail: false,
                    isManuallyFixed: true
                },
            }
        );
    },
    async markSingleAsSuccess(topic, subscription, events) {
        const subscriptionCollection = await getCollection("event_subscription");

        const eventIds = events.map(item => ObjectId(item));

        await subscriptionCollection.updateMany(
            {
                topic,
                subscription,
                eventId: { $in: eventIds }
            },
            {
                $set: {
                    isSuccess: true,
                    isError: false,
                    isPreconditionFail: false,
                    isManuallyFixed: true
                },
            }
        );
    },
};
