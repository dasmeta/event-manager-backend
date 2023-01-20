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
        const eventIdList = await strapi.query('event-subscription').model.query(qb => {
            qb.where({
                topic,
                subscription,
                isError: true,
                isPreconditionFail: false,
                isSuccess: false,
            })
            qb.select({ eventId: 'eventId'})
            qb.orderBy('created_at', 'ASC')
        }).fetchPage({
            limit,
            withRelated: [],
        });

        const ids = eventIdList.toJSON().map(item => item.eventId);
        const result = await strapi.query('event').model
            .where('id', 'in', ids)
            .orderBy('created_at', 'ASC')
            .fetchAll();

        return result.toJSON();
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
            qb.orderBy('created_at', 'ASCs')
        }).fetchPage({
            limit,
            withRelated: [],
        });

        const ids = eventIdList.toJSON().map(item => item.eventId);
        const result = await strapi.query('event').model
            .where('id', 'in', ids)
            .orderBy('created_at', 'ASC')
            .fetchAll();
    
        return result.toJSON();
    }

    async getPreconditionFailEvents(topic, subscription, limit = Number.MAX_SAFE_INTEGER) {
        const eventIdList = await strapi.query('event-subscription').model.query(qb => {
            qb.where({
                topic,
                subscription,
                isError: false,
                isPreconditionFail: true,
                isSuccess: false
            })
            qb.select({ eventId: 'eventId'})
            qb.orderBy('created_at', 'ASC')
        }).fetchPage({
            limit,
            withRelated: [],
        });

        const ids = eventIdList.toJSON().map(item => item.eventId);
        const result = await strapi.query('event').model
            .where('id', 'in', ids)
            .orderBy('created_at', 'ASC')
            .fetchAll();

        return result.toJSON();
    }

    async getSubscriptionsWithoutEvents(topic, subscription) {
        const data = await strapi.query('event-subscription').model
            .where({
                topic,
                subscription
            })
            .where('eventId', 'is', null)
            .fetchAll();

        return data.toJSON();
    }

    async getDuplicateSubscriptions(topic, subscription) {
        const knex = strapi.connections.default;

        const result = await knex('event_subscription')
            .where({
                topic,
                subscription
            })
            .groupBy('eventId')
            .select({
               id: 'eventId',
               count: knex.raw('COUNT(id)'),
               createdAts: knex.raw('ARRAY_AGG("created_at")')
            });

        return result.filter(item => item.count > 1);
    }

    async removeUnnecessarySubscriptions(topic, subscription) {
        const list = await this.getSubscriptionsWithoutEvents(topic, subscription);
        const duplicates = await this.getDuplicateSubscriptions(topic, subscription);

        const knex = strapi.connections.default;

        const ids = list.map(item => item.id);
        if(ids.length) {
            await knex('event_subscription')
                .whereIn('id', ids)
                .delete();
        }

        duplicates.forEach(async item => {
            const eventId = item.id;
            const createdAts = item.createdAts.sort((a, b) => a.getTime() - b.getTime());
            createdAts.pop();
            await knex('event_subscription')
                .whereIn('created_at', createdAts)
                .where('eventId', eventId)
                .delete();
        });
    }

    async getMissingEvents(topic, subscription) {
        const knex = strapi.connections.default;

        return knex('event_subscription')
            .select({ 
                id: 'eventId',
                subscriptions: knex.raw('ARRAY_AGG(subscription)')
            })
            .where({
                topic
            })
            .groupBy('eventId')
            .havingNotIn(knex.raw('ARRAY_AGG(subscription)'), `{${subscription}}`);
    }

    async getExistingEvents(ids) {
        const knex = strapi.connections.default;
        return knex('event')
            .select({ id: 'id' })
            .whereIn('id', ids);
    }

    async getEventsByIds(ids) {
        const knex = strapi.connections.default;
        return knex('event')
            .whereIn('id', ids)
            .orderBy('created_at', 'ASC');
    }

    async getEventsByTopic(topic, start, limit) {
        const knex = strapi.connections.default;
        return knex('event')
            .select({ id: 'id' })
            .where({ topic })
            .offset(start)
            .limit(limit);
    }

    async getEventsWithSubscription(subscription, eventIds) {
        const knex = strapi.connections.default;
        const result = await knex('event_subscription')
            .distinct("eventId")
            .where({
                subscription,
            })
            .whereIn("eventId", eventIds);
        return result.reduce((acc, item) => {
            acc.push(item.eventId);
            return acc;
        }, []);
    }

    async createOrUpdateSubscription(condition, data) {
        const knex = strapi.connections.default;
        const row = await knex('event_subscription')
            .where(condition)
            .select({ id: 'id' })
            .first();
        
        if(!row) {
            return knex('event_subscription')
                .insert({
                    ...condition,
                    ...data
                });
        }

        return knex('event_subscription')
            .where({ id: row.id })
            .update({...data})
    }

    async updateSubscriptionByDate(topic, subscription, start, end, data) {
        const knex = strapi.connections.default;
        return knex('event_subscription')
            .where({
                topic,
                subscription
            })
            .where('created_at', '>=', start)
            .where('created_at', '<=', end)
            .update(data);
    }

    async updateSubscriptionByType(topic, subscription, type, data) {
        const knex = strapi.connections.default;
        return knex('event_subscription')
            .where({
                topic,
                subscription,
                isSuccess: false,
                isError: type === "error",
                isPreconditionFail: type === "preconditionFail"
            })
            .update(data);
    }

    async updateSubscriptionByEvents(topic, subscription, eventIds, data) {
        const knex = strapi.connections.default;
        return knex('event_subscription')
            .where({
                topic,
                subscription
            })
            .whereIn('eventId', eventIds)
            .update(data);
    }

    async recordStart(topic, subscription, eventId, traceId) {
        return this.createOrUpdateSubscription({
            subscription,
            eventId,
        }, {
            topic,
            traceId,
            isSuccess: false,
            isError: false,
            isPreconditionFail: false
        });
    }

    async recordSuccess(topic, subscription, eventId, traceId) {
        return this.createOrUpdateSubscription({
            eventId,
            subscription
        }, {
            topic,
            traceId,
            isSuccess: true,
            isError: false,
            isPreconditionFail: false
        })
    }

    async recordFailure(topic, subscription, eventId, traceId, error) {
        const errObject = Object.getOwnPropertyNames(error).reduce((acc, key) => {
            acc[key] = error[key];
            return acc;
        }, {});

        return this.createOrUpdateSubscription({
            eventId,
            subscription
        }, {
            topic,
            traceId,
            error: errObject,
            isSuccess: false,
            isError: true,
            isPreconditionFail: false,
        });
    }

    async recordPreconditionFailure(topic, subscription, eventId, traceId) {
        return this.createOrUpdateSubscription({
            eventId,
            subscription
        }, {
            topic,
            traceId,
            isSuccess: false,
            isError: false,
            isPreconditionFail: true,
        })
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