const { Kafka } = require('kafkajs');
const { EventEmitter } = require('events')
const { debugIfEnabled } = require("../../helper/logger");
const uuid = require("uuid/v4");

class messageAdapter {
    message;
    data;

    constructor(message, resolveOffset) {
        this.message = message;
        this.data = message.value;
        this.resolveOffset = resolveOffset;
    }

    ack() {
        this.resolveOffset(this.message.offset);
    }
}

class subscriptionAdapter {
    /**
     * @type topicAdapter
     */
    topicAdapter;
    consumer;
    isConsumerConnected = false;

    constructor(consumer, topicAdapter) {
        this.consumer = consumer;
        this.topicAdapter = topicAdapter;
    }

    async exists(...props) {
        return [this.isConsumerConnected];
    }

    async create() {
        if (!this.isConsumerConnected) {
            const topicName = this.topicAdapter.getTopicName();

            debugIfEnabled('CONNECTING CONSUMER', topicName);

            await this.consumer.connect();
            await this.consumer.subscribe({ topic: topicName });

            this.isConsumerConnected = true;
        }
    }

    async on(key, callback) {
        if (key === 'message') {
            await this.onMessageSuccess(callback);
        }
    }

    async onMessageSuccess(callback) {
        await this.consumer.run({
            eachBatchAutoResolve: true,
            eachBatch: async ({
                batch,
                resolveOffset,
                heartbeat,
                commitOffsetsIfNecessary,
                uncommittedOffsets,
                isRunning,
                isStale,
            }) => {
                for (let message of batch.messages) {
                    debugIfEnabled({
                        topic: batch.topic,
                        partition: batch.partition,
                        highWatermark: batch.highWatermark,
                        message: {
                            offset: message.offset,
                            value: message.value.toString(),
                            headers: message.headers,
                        }
                    });
                    if (!isRunning() || isStale()) {
                        debugIfEnabled('Consumer is Not In Running or Stale state');
                        break;
                    }
                    callback(new messageAdapter(message, resolveOffset));

                    await heartbeat();
                }
            },
        });
    }
}

class topicAdapter {
    subscriptionMap = new Map();

    producerWaiting = false;
    producerEmitter = new EventEmitter();

    constructor(name, client) {
        this.name = name;
        this.client = client;
        this.producer = this.client.producer();
        this.isProducerConnected = false;
    }

    getTopicName() {
        return this.name;
    }

    subscription(subscriptionName) {
        if (!this.subscriptionMap.has(subscriptionName)) {
            const consumer = this.client.consumer({ groupId: subscriptionName });
            const topicAdapter = this;
            const subscriptionAdapterObj = new subscriptionAdapter(consumer, topicAdapter);

            this.subscriptionMap.set(subscriptionName, subscriptionAdapterObj);
        }
        return this.subscriptionMap.get(subscriptionName);
    }

    async exists() {
        return [true];
    }

    async create(...props) {
        return true
    }

    async publish(...props) {
        const message = props[0].toString();
        const producer = await this.getProducer();

        await producer.send({
            topic: this.name,
            messages: [{
                value: message,
            }]
        });

        await producer.disconnect()
        return uuid();
    }

    async getProducer() {
        if (this.isProducerConnected) {
            return this.producer;
        }
        const producerEmitter = this.producerEmitter;

        if (this.producerWaiting) {
            return new Promise(resolve => {
                producerEmitter.setMaxListeners(producerEmitter.getMaxListeners() + 1);
                producerEmitter.once('ProducerConnected', () => {
                    resolve(this.producer);
                    producerEmitter.setMaxListeners(Math.max(producerEmitter.getMaxListeners() - 1, 0));
                });
            });
        }
        this.producerWaiting = true;

        debugIfEnabled('CONNECTING PRODUCER');

        await this.producer.connect();

        this.isProducerConnected = true;
        this.producerWaiting = false;

        producerEmitter.emit('ProducerConnected');

        return this.producer;
    }
}

/**
 * Publisher Subscriber client adapter for Kafka
 *
 * Required env
 * - KAFKA_BROKERS
 */
class clientAdapter {
    client;
    producerMap = new Map();

    constructor(...props) {
        this.client = new Kafka({
            clientId: 'my-app',
            brokers: process.env.KAFKA_BROKERS.split(';')
        })
    }

    topic(name) {
        if (!this.producerMap.has(name)) {
            this.producerMap.set(name, new topicAdapter(name, this.client));
        }
        return this.producerMap.get(name);
    }

    createSubscription(...props) {
        // Should not reach here
        throw Error('Method is not implemented');
    }
}

module.exports = {
    clientAdapter
}
