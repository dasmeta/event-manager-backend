const { getSubscription } = require("./pubsub");
const store = require("./helper/store");
const bugsnag = require("./helper/bugsnag");
const logger = require("./helper/logger");

const autoStartedClasses = new Map();
const multiSubscriptions = new Map();

const subscriptionHandler = (topic, subscription, handler, maxAttempts = 5) => async subscriptionObject => {
    const onMessage = message => {
        const { eventId, traceId, data, subscription: eventSubscription = "", dataSource } = JSON.parse(message.data.toString());
        const context = { topic, subscription, traceId, dataSource };

        if (logger.isDebug()) {
            logger.debug(`RECEIVE eventId: ${eventId}, topic: ${topic}, subscription: ${subscription}`);
        }
        if (eventSubscription && subscription !== eventSubscription) {
            if (logger.isDebug()) {
                logger.debug(`SKIP event subscription: "${eventSubscription}", current subscription: ${subscription}`);
            }
            message.ack();
            return;
        }
        const fulfilled = async () => {
            if (logger.isDebug() && eventId) {
                logger.timeEnd(`EXEC eventId: ${eventId}, topic: ${topic}, subscription: ${subscription}`);
            }
            if (logger.isDebug()) {
                logger.debug("EXEC SUCCESS");
            }
            if (eventId) {
                await store.recordSuccess({ topic, subscription, eventId, traceId });
            }
            if (logger.isDebug()) {
                logger.debug(`ACK Before eventId: ${eventId}, topic: ${topic}, subscription: ${subscription}`);
            }
            message.ack();

            if (logger.isDebug()) {
                logger.debug(
                    `ACK After. Subscription Collection updated eventId: ${eventId}, topic: ${topic}, subscription: ${subscription}`
                );
            }
        };
        const rejected = async err => {
            logger.error("HANDLE ERROR", err, { topic, subscription, data, eventId });
            bugsnag.notify(err, { topic, subscription, data, eventId });
            if (logger.isDebug() && eventId) {
                logger.timeEnd(`EXEC eventId: ${eventId}, topic: ${topic}, subscription: ${subscription}`);
            }
            if (logger.isDebug()) {
                logger.error("EXEC FAIL", { topic, subscription });
            }

            if (eventId) {
                if (err.message.includes("PreconditionFailedError")) {
                    if ((await store.hasReachedMaxAttempts({ topic, subscription, eventId, maxAttempts }))) {
                        await store.recordFailure({ topic, subscription, eventId, traceId, error: err });
                    } else {
                        await store.recordPreconditionFailure({ topic, subscription, eventId, traceId });
                    }
                } else {
                    await store.recordFailure({ topic, subscription, eventId, traceId, error: err });
                }
            }
            if (logger.isDebug()) {
                logger.debug("Subscription Collection updated");
            }
            if (! err.message.includes("PreconditionFailedError")) {
                message.ack();
            }
        };

        if (logger.isDebug() && eventId) {
            logger.timeStart(`EXEC eventId: ${eventId}, topic: ${topic}, subscription: ${subscription}`);
        }
        if (eventId) {
            store
                .recordStart({ topic, subscription, eventId })
                .then(() => {
                    handler(data, context).then(fulfilled, rejected);
                })
                .catch(err => {
                    logger.error("ERROR: Can not store record start, it is probably issue with mongodb", err);
                    bugsnag.notify(err, { topic, subscription, eventId });
                });
        } else {
            handler(data, context).then(fulfilled, rejected);
        }
    };

    const onError = err => {
        logger.error("SUBSCRIPTION ERROR", err, { topic, subscription });
        bugsnag.notify(err, { topic, subscription });
        // process.exit(1);
    };

    subscriptionObject.onMessage = onMessage;
    subscriptionObject.onError = onError;
    subscriptionObject.on("message", onMessage);
    subscriptionObject.on("error", onError);
};

module.exports = {
    autoStart(Class) {
        if (logger.isTest()) {
            return Class;
        }

        const instance = new Class();
        autoStartedClasses.set(instance.constructor.name, instance);

        return Class;
    },
    subscribe(topic) {
        return function decorator(target, name, descriptor) {
            if (logger.isTest()) {
                return descriptor;
            }
            const className = target.constructor.name;
            const subscriptionName = `${className}-${name}`;
            getSubscription(topic, subscriptionName)
                .then(
                    subscriptionHandler(topic, subscriptionName, async data => {
                        const instance = autoStartedClasses.get(className);
                        if (!instance) {
                            return null;
                        }
                        await instance[name](data);
                    })
                )
                .catch(err => {
                    logger.error(`GET "${subscriptionName}" SUBSCRIPTION ERROR`, err, { topic, subscriptionName });
                    bugsnag.notify(err, { topic, subscriptionName });
                    process.exit(1);
                });

            return descriptor;
        };
    },
    registerSubscriber(topic, subscriptionName, handler, maxAttempts) {
        getSubscription(topic, subscriptionName)
            .then(subscriptionHandler(topic, subscriptionName, handler, maxAttempts))
            .catch(err => {
                logger.error(`GET "${subscriptionName}" SUBSCRIPTION ERROR`, err, { topic, subscriptionName });
                bugsnag.notify(err, { topic, subscriptionName });
                process.exit(1);
            });
    },
    async subscribeMulti(subscriptionNamePrefix, topicList, callBack) {
        topicList.forEach(topic => {
            const subscriptionName = `${subscriptionNamePrefix}-multi-${topic}`;
            if (multiSubscriptions.has(subscriptionNamePrefix)) {
                multiSubscriptions.get(subscriptionNamePrefix).forEach(subscription => {
                    subscription.removeListener("message", subscription.onMessage);
                    subscription.removeListener("error", subscription.onError);
                });
            }
            multiSubscriptions.set(subscriptionNamePrefix, []);
            getSubscription(topic, subscriptionName)
                .then(async subscription => {
                    const arr = multiSubscriptions.get(subscriptionNamePrefix);
                    arr.push(subscription);
                    multiSubscriptions.set(subscriptionNamePrefix, arr);

                    await subscriptionHandler(topic, subscriptionName, async data => await callBack(topic, data))(
                        subscription
                    );
                })
                .catch(err => {
                    logger.error(`GET "${subscriptionName}" SUBSCRIPTION ERROR::subscribeMulti`, err, {
                        topic,
                        subscriptionName,
                    });
                    bugsnag.notify(err, { topic, subscriptionName });
                    process.exit(1);
                });
        });
    },
};
