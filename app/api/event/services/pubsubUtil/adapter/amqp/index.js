const amqplib = require('amqplib');
const  { Buffer } = require('buffer');

class messageAdapter {
    #AMQPMessage;
    #channel;

    constructor(AMQPMessage, channel) {
        this.#channel = channel;
        this.#AMQPMessage = AMQPMessage;

        const content = JSON.parse(AMQPMessage.content.toString());

        this.data = Buffer.from(JSON.stringify(content));
    }

    ack() {
        this.#channel.ack(this.#AMQPMessage);
    }
}

class subscriptionAdapter {
    #channel;

    /**
     * Rabbitmq queue name and subscription tag
     * @type string
     */
    #name;

    /**
     * @type topicAdapter
     */
    #topic;

    onMassage = async () => {};
    onError = async () => {};

    constructor(name, topic) {
        this.#name = name;
        this.#topic = topic;
    }

    async exists(...props) {
        await this.#topic.exists();

        this.#channel = await (this.#topic.channel)
        await this.#channel.assertQueue(this.#name, {
            exclusive: true
        })

        await this.#channel.bindQueue(this.#name, this.#topic.name, '');

        return [true];
    }

    async create() {
        return true;
    }

    async on(key, callback) {
        if (key === 'message') {
            await this.exists()

            const channel = this.#channel;

            this.onMassage = async (msg) => {
                if (msg !== null) {
                    await callback(new messageAdapter(msg, channel))
                }
            }

            this.#channel.consume(this.#name, this.onMassage, {
                consumerTag: this.#name,
                noAck: false
            });
        } else if (key === 'error') {
            console.log(`key: '${key}' handler is not implemented`)
        } else {
            console.error(`key: '${key}' handler is not implemented`)
        }
    }

    removeListener(key, callback) {
        this.#topic.channel.then(ch => {
            ch.cancel(this.#name)
        });
    }
}

class topicAdapter {
    /**
     * @type string
     */
    #exchangeType;

    constructor(name, channel) {
        /* Rabbitmq exchanger name */
        this.name = name;

        /* Rabbitmq opened channel */
        this.channel = channel;

        /* Rabbitmq exchanger type */
        this.#exchangeType = 'fanout';
    }

    subscription(name) {
        return new subscriptionAdapter(name, this);
    }

    async exists() {
        await this.create();
        return [true];
    }

    async create(...props) {
        return (await this.channel).assertExchange(this.name, this.#exchangeType, {
            durable: true,
            ...props
        });
    }

    async publish(...props) {
        return (await this.channel).publish(
            this.name,
            '',
            ...props
        );
    }
}

/**
 * Publisher Subscriber client adapter for AMQP
 *
 * Required env
 * - RABBITMQ_URL || AMQP_URL
 */
class clientAdapter {
    /**
     * @type function
     */
    #getChannel;

    constructor(...props) {
        this.openConnectionPromise = amqplib.connect(process.env.RABBITMQ_URL || process.env.AMQP_URL);

        this.#getChannel = async () => {
            const connection = await this.openConnectionPromise;
            return await connection.createChannel();
        }
    }

    topic(name) {
        return new topicAdapter(name, this.#getChannel());
    }

    createSubscription(...props) {
        // todo implement creation and configuration
        throw Error('Method is not implemented');
    }
}

module.exports = {
    clientAdapter
}
