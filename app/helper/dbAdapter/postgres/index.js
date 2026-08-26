const { getPostgresIndexes } = require("../indexes");

class client {
    async getErrors(topic, subscription, start = 0, limit = 5) {
        const knex = strapi.connections.default;
        const offset = parseInt(start, 10) || 0;
        const pageLimit = parseInt(limit, 10) || 5;

        const groups = await knex('event_subscription')
            .where({
                topic,
                subscription,
                isError: true,
            })
            .select({
                _id: knex.raw("error->>'message'"),
                count: knex.raw('COUNT(id)'),
            })
            .groupByRaw("error->>'message'")
            .orderBy('count', 'desc')
            .offset(offset)
            .limit(pageLimit);

        const results = [];
        for (const group of groups) {
            const details = await knex('event_subscription')
                .where({
                    topic,
                    subscription,
                    isError: true,
                })
                .whereRaw("error->>'message' = ?", [group._id])
                .orderBy('updated_at', 'desc')
                .limit(20)
                .select({
                    eventId: 'eventId',
                    error: 'error',
                });

            results.push({
                _id: group._id,
                count: Number(group.count),
                error: details[0] ? details[0].error : null,
                eventIds: details.map((row) => row.eventId),
            });
        }

        return results;
    }

    async getGroupedEvents() {
        const knex = strapi.connections.default;
        return knex('event')
            .groupBy('topic')
            .select({ _id: 'topic', total: knex.raw('COUNT(id)') });
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
                preconditionFail: knex.raw('COUNT(nullif("isPreconditionFail", false))'),
            });

        return result.map((item) => ({
            _id: {
                topic: item.topic,
                subscription: item.subscription,
            },
            count: item.count,
            success: item.success,
            error: item.error,
            preconditionFail: item.preconditionFail,
        }));
    }

    async getGroupedSubscriptionsForSingleTopic(topic, subscription) {
        const knex = strapi.connections.default;
        const row = await knex('event_subscription')
            .where({
                topic,
                subscription,
            })
            .select({
                count: knex.raw('COUNT(id)'),
                success: knex.raw('COUNT(nullif("isSuccess", false))'),
                error: knex.raw('COUNT(nullif("isError", false))'),
                preconditionFail: knex.raw('COUNT(nullif("isPreconditionFail", false))'),
            })
            .first();

        return {
            count: Number((row && row.count) || 0),
            success: Number((row && row.success) || 0),
            error: Number((row && row.error) || 0),
            preconditionFail: Number((row && row.preconditionFail) || 0),
        };
    }

    async createOrUpdateStats(topic, subscription, data) {
        const stats = await strapi.query('event-stats').model
            .where({
                topic,
                subscription,
            })
            .fetch();

        if (stats) {
            return stats.save({
                topic,
                subscription,
                ...data,
            });
        }

        return strapi.query('event-stats').model
            .forge({})
            .save({
                topic,
                subscription,
                ...data,
            });
    }

    async fetchSubscriptionEventIds(where, limit, message) {
        const eventIdList = await strapi.query('event-subscription').model.query((qb) => {
            qb.where(where);
            if (message) {
                qb.whereRaw("error->>'message' = ?", [message]);
            }
            qb.select({ eventId: 'eventId' });
            qb.orderBy('created_at', 'ASC');
        }).fetchPage({
            limit,
            withRelated: [],
        });

        return eventIdList.toJSON().map((item) => item.eventId);
    }

    async getErrorEventIds(topic, subscription, limit, message) {
        return this.fetchSubscriptionEventIds({
            topic,
            subscription,
            isError: true,
            isPreconditionFail: false,
            isSuccess: false,
        }, limit, message);
    }

    async getFailEventIds(topic, subscription, limit) {
        return this.fetchSubscriptionEventIds({
            topic,
            subscription,
            isError: false,
            isPreconditionFail: false,
            isSuccess: false,
        }, limit);
    }

    async getPreconditionFailEventIds(topic, subscription, limit = Number.MAX_SAFE_INTEGER) {
        return this.fetchSubscriptionEventIds({
            topic,
            subscription,
            isError: false,
            isPreconditionFail: true,
            isSuccess: false,
        }, limit);
    }

    async getErrorEvents(topic, subscription, limit, message) {
        const ids = await this.getErrorEventIds(topic, subscription, limit, message);
        if (!ids.length) {
            return [];
        }

        const result = await strapi.query('event').model
            .where('id', 'in', ids)
            .orderBy('created_at', 'ASC')
            .fetchAll();

        return result.toJSON();
    }

    async getFailEvents(topic, subscription, limit) {
        const ids = await this.getFailEventIds(topic, subscription, limit);
        if (!ids.length) {
            return [];
        }

        const result = await strapi.query('event').model
            .where('id', 'in', ids)
            .orderBy('created_at', 'ASC')
            .fetchAll();

        return result.toJSON();
    }

    async getPreconditionFailEvents(topic, subscription, limit = Number.MAX_SAFE_INTEGER) {
        const ids = await this.getPreconditionFailEventIds(topic, subscription, limit);
        if (!ids.length) {
            return [];
        }

        const result = await strapi.query('event').model
            .where('id', 'in', ids)
            .orderBy('created_at', 'ASC')
            .fetchAll();

        return result.toJSON();
    }

    async getSubscriptionsWithoutEvents(topic, subscription) {
        const knex = strapi.connections.default;

        return knex('event_subscription as es')
            .leftJoin('event as e', 'es.eventId', 'e.id')
            .where({
                'es.topic': topic,
                'es.subscription': subscription,
            })
            .where(function () {
                this.whereNull('es.eventId').orWhereNull('e.id');
            })
            .select('es.*');
    }

    async getDuplicateSubscriptions(topic, subscription) {
        const knex = strapi.connections.default;

        const result = await knex('event_subscription')
            .where({
                topic,
                subscription,
            })
            .groupBy('eventId')
            .select({
                id: 'eventId',
                count: knex.raw('COUNT(id)'),
                createdAts: knex.raw('ARRAY_AGG("created_at")'),
            });

        return result.filter((item) => item.count > 1);
    }

    async removeUnnecessarySubscriptions(topic, subscription) {
        const list = await this.getSubscriptionsWithoutEvents(topic, subscription);
        const duplicates = await this.getDuplicateSubscriptions(topic, subscription);

        const knex = strapi.connections.default;

        const ids = list.map((item) => item.id);
        if (ids.length) {
            await knex('event_subscription')
                .whereIn('id', ids)
                .delete();
        }

        await Promise.all(
            duplicates.map(async (item) => {
                const eventId = item.id;
                const createdAts = [...item.createdAts].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
                createdAts.pop();
                if (!createdAts.length) {
                    return;
                }
                await knex('event_subscription')
                    .whereIn('created_at', createdAts)
                    .where('eventId', eventId)
                    .delete();
            })
        );
    }

    async getMissingEvents(topic, subscription) {
        const knex = strapi.connections.default;

        return knex('event_subscription')
            .select({
                id: 'eventId',
                subscriptions: knex.raw('ARRAY_AGG(subscription)'),
            })
            .where({
                topic,
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
            .distinct('eventId')
            .where({
                subscription,
            })
            .whereIn('eventId', eventIds);
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

        const now = new Date();

        if (!row) {
            return knex('event_subscription')
                .insert({
                    ...condition,
                    ...data,
                    created_at: now,
                    updated_at: now,
                });
        }

        return knex('event_subscription')
            .where({ id: row.id })
            .update({
                ...data,
                updated_at: now,
            });
    }

    async updateSubscriptionByDate(topic, subscription, start, end, data) {
        const knex = strapi.connections.default;
        return knex('event_subscription')
            .where({
                topic,
                subscription,
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
                isError: type === 'error',
                isPreconditionFail: type === 'preconditionFail',
            })
            .update(data);
    }

    async updateSubscriptionByEvents(topic, subscription, eventIds, message, data) {
        const knex = strapi.connections.default;
        const query = knex('event_subscription')
            .where({
                topic,
                subscription,
            });

        if (!eventIds || eventIds.length === 0) {
            return query
                .whereRaw("error->>'message' = ?", [message])
                .update(data);
        }

        return query
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
            isPreconditionFail: false,
        });
    }

    async recordSuccess(topic, subscription, eventId, traceId) {
        return this.createOrUpdateSubscription({
            eventId,
            subscription,
        }, {
            topic,
            traceId,
            isSuccess: true,
            isError: false,
            isPreconditionFail: false,
        });
    }

    async recordFailure(topic, subscription, eventId, traceId, error) {
        const errObject = Object.getOwnPropertyNames(error).reduce((acc, key) => {
            acc[key] = error[key];
            return acc;
        }, {});

        return this.createOrUpdateSubscription({
            eventId,
            subscription,
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
            subscription,
        }, {
            topic,
            traceId,
            isSuccess: false,
            isError: false,
            isPreconditionFail: true,
        });
    }

    async hasReachedMaxAttempts(topic, subscription, eventId, maxAttempts = 5) {
        const events = await strapi.query('event-subscription').model.query((qb) => {
            qb.where({ eventId, subscription, topic })
                .andWhere('attempts', '>', parseInt(maxAttempts, 10));
        }).fetchAll();

        return !!events.length;
    }

    async getTopicList() {
        const knex = strapi.connections.default;
        const list = await knex('event').distinct('topic');
        return list.map((item) => item.topic);
    }

    async getSubscriptionListByTopic(topic) {
        const knex = strapi.connections.default;
        const list = await knex('event_subscription')
            .where({ topic })
            .distinct('subscription');
        return list.map((item) => item.subscription);
    }

    async getFirstSubscription() {
        const knex = strapi.connections.default;
        return knex('event_subscription')
            .orderBy('created_at', 'asc')
            .first();
    }

    async getEventsToRemove(start, end) {
        if (!start || !end) {
            return [];
        }

        const knex = strapi.connections.default;
        const rows = await knex('event_subscription')
            .where('created_at', '>=', new Date(start))
            .where('created_at', '<', new Date(end))
            .groupBy('eventId')
            .select({
                eventId: 'eventId',
                total: knex.raw('COUNT(id)'),
                succeededCount: knex.raw('COUNT(nullif("isSuccess", false))'),
            })
            .havingRaw('COUNT(id) = COUNT(nullif("isSuccess", false))');

        return rows.map((row) => row.eventId);
    }

    async archiveData(eventIds = []) {
        if (!eventIds.length) {
            return;
        }

        const knex = strapi.connections.default;
        const events = await knex('event').whereIn('id', eventIds);
        const subscriptions = await knex('event_subscription').whereIn('eventId', eventIds);

        if (events.length) {
            const archiveEvents = events.map(({ id, ...rest }) => rest);
            await knex('event_archives').insert(archiveEvents);
        }

        if (subscriptions.length) {
            const archiveSubscriptions = subscriptions.map(({ id, ...rest }) => rest);
            await knex('event_subscription_archives').insert(archiveSubscriptions);
        }

        await knex('event_subscription').whereIn('eventId', eventIds).delete();
        await knex('event').whereIn('id', eventIds).delete();
    }

    async ensureIndexes() {
        const knex = strapi.connections.default;
        const indexes = getPostgresIndexes();

        const normalize = (sql) => String(sql || '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/"/g, '')
            .replace(/public\./g, '')
            .trim();

        for (const index of indexes) {
            const existing = await knex('pg_indexes')
                .where({ indexname: index.name })
                .first();

            if (!existing) {
                await knex.raw(index.createSql);
                continue;
            }

            const actual = normalize(existing.indexdef);
            const tableToken = `on ${normalize(index.table)} `;
            const tableTokenQuoted = `on "${normalize(index.table)}" `;
            const tableMatch = actual.includes(tableToken) || actual.includes(tableTokenQuoted)
                || actual.includes(`on public.${normalize(index.table)} `);

            const columnsMatch = index.columns.every((col) => {
                const fragment = normalize(col.replace(/ DESC$/i, ''));
                return actual.includes(fragment);
            });

            if (!columnsMatch || !tableMatch) {
                await knex.raw(`DROP INDEX IF EXISTS "${index.name}"`);
                await knex.raw(index.createSql);
            }
        }
    }
}

module.exports = {
    client,
};
