/**
 * Names of available message queue implementations
 * to be provided by configuration process.env.MQ_CLIENT_NAME
 * @type {string[]}
 */
const mqClientNames = [
    'GCP',
    'AMQP',
    'Kafka',
];

const defaultMqClientName = 'GCP';

/**
 * Factory class to create Publisher Subscriber client
 *
 * Required env
 * - MQ_CLIENT_NAME
 */
class clientFactory {
    static createClient() {
        const mqClientName = process.env.MQ_CLIENT_NAME || defaultMqClientName;
        if (!mqClientNames.includes(mqClientName)) {
            throw Error("MQ_CLIENT_NAME is invalid, use one of ['" + mqClientNames.join("', '") + "']");
        }
        return this[`create${mqClientName}Client`]();
    }

    static createGCPClient(...props) {
        const {clientAdapter} = require("./pubsub");
        return new clientAdapter(...props)
    }

    static createAMQPClient(...props) {
        const {clientAdapter} = require("./amqp");
        return new clientAdapter(...props)
    }

    static createKafkaClient(...props) {
        const {clientAdapter} = require("./kafka");
        return new clientAdapter(...props)
    }
}

module.exports = {
    clientFactory
};
