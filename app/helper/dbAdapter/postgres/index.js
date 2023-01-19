class client {
    async getErrors(topic, subscription) {
        const knex = strapi.connections.default;

        return knex('event_subscription')
            .where({
                topic,
                subscription,
                isError: true
            })
            .select({
                _id: knex.raw("error->>'message'"),
                count: knex.raw('COUNT(id)'),
                error: knex.raw("error"),
                eventIds: knex.raw('ARRAY_AGG("eventId")')
            })
            .groupByRaw("error->>'message', error");
    }

    async getGroupedEvents() {
        const knex = strapi.connections.default;
        return knex('event')
            .groupBy('topic')
            .select({ _id: 'topic', total: knex.raw('COUNT(id)')})
    }

    async getGroupedSubscriptions() {
        const knex = strapi.connections.default;
        const result = await knex('event_subscription')
            .groupBy(['topic', 'subscription'])
            .select({ 
                topic: 'topic', 
                subscription: 'subscription',
                count: knex.raw('COUNT(id)'),
                success: knex.raw('COUNT(nullif("isSuccess", false))'),
                error: knex.raw('COUNT(nullif("isError", false))'),
                preconditionFail: knex.raw('COUNT(nullif("isPreconditionFail", false))')
            });

        return result.map(item => ({
            _id: {
                topic: item.topic,
                subscription: item.subscription
            },
            count: item.count,
            success: item.success,
            error: item.error,
            preconditionFail: item.preconditionFail
        }))
    }

    async getGroupedSubscriptionsForSingleTopic(topic, subscription) {
        const knex = strapi.connections.default;
        return knex('event_subscription')
            .where({
                topic,
                subscription
            })
            .groupBy(['topic', 'subscription'])
            .select({ 
                count: knex.raw('COUNT(id)'),
                success: knex.raw('COUNT(nullif("isSuccess", false))'),
                error: knex.raw('COUNT(nullif("isError", false))'),
                preconditionFail: knex.raw('COUNT(nullif("isPreconditionFail", false))')
            });
    }

    async createOrUpdateStats(topic, subscription, data) {
        const stats = await strapi.query('event-stats').model
            .where({
                topic,
                subscription
            })
            .fetch();

        if(stats) {
            return stats.save({
                topic,
                subscription,
                ...data,
            })
        }

        return strapi.query('event-stats').model
            .forge({})
            .save({
                topic,
                subscription,
                ...data,
            });
    }

    async getErrorEvents(topic, subscription, limit) {
        const eventIdList = await strapi.query('event-subscription').model
            .where({
                topic,
                subscription,
                isError: true,
                isPreconditionFail: false,
                isSuccess: false,
            })
            .orderBy({ 'createdAt': 'ASC' })
            .fetchPage({
                columns: ['eventId'],
                limit
            });

        const ids = eventIdList.map(item => item.eventId);
        return strapi.query('event').model
            .where('id', 'in', ids)
            .orderBy({ 'createdAt': 'ASC' })
            .fetchAll();
    }

    async getFailEvents(topic, subscription, limit) {
        const eventIdList = await strapi.query('event-subscription').model.query(qb => {
            qb.where({
                topic,
                subscription,
                isError: false,
                isPreconditionFail: false,
                isSuccess: false
            })
            qb.select({ eventId: 'eventId'})
            qb.orderBy('created_at', 'asc')
        }).fetchPage({
            limit,
            withRelated: [],
        });

        const ids = eventIdList.toJSON().map(item => item.eventId);
        console.log(ids);
        return strapi.query('event').model
            .where('id', 'in', ids)
            .orderBy({ 'created_at': 'ASC' })
            .fetchAll();
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

    async recordStart(topic, subscription, eventId, traceId) {
        return strapi.query('event-subscription').model
            .where({
                eventId,
                subscription
            })
            .save({
                eventId,
                subscription,
                topic,
                traceId,
                isSuccess: false,
                isError: false,
                isPreconditionFail: false
            });
    }

    async recordSuccess(topic, subscription, eventId, traceId) {
        return strapi.query('event-subscription').model
            .where({
                eventId,
                subscription
            })
            .save({
                topic,
                traceId,
                isSuccess: true,
                isError: false,
                isPreconditionFail: false,
            }, {
                patch: true
            });
    }

    async recordFailure(topic, subscription, eventId, traceId, error) {

         const errObject = Object.getOwnPropertyNames(error).reduce((acc, key) => {
            acc[key] = error[key];
            return acc;
        }, {});

        return strapi.query('event-subscription').model
            .where({
                eventId,
                subscription
            })
            .save({
                topic,
                traceId,
                error: errObject,
                isSuccess: false,
                isError: true,
                isPreconditionFail: false,
            }, {
                patch: true
            });
    }

    async recordPreconditionFailure(topic, subscription, eventId, traceId) {

        return strapi.query('event-subscription').model
            .where({
                eventId,
                subscription
            })
            .save({
                topic,
                traceId,
                error: errObject,
                isSuccess: false,
                isError: false,
                isPreconditionFail: true,
            }, {
                patch: true
            });
    }

    async hasReachedMaxAttempts(topic, subscription, eventId, maxAttempts = 5) {

        const events = await strapi.query('event-subscription').model.query(qb => {
            qb.where({ eventId, subscription, topic })
                .andWhere('attempts', '>', parseInt(maxAttempts))
        }).fetchAll();

        return !!events.length;
    }
}

module.exports = {
    client
}