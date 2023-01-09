const _ = require('lodash');

/**
 * Names of available message queue implementations
 * to be provided by configuration process.env.DATABASE_CLIENT
 * @type {string[]}
 */
 const dbClientNames = [
    'mongo',
    'postgres'
];

const defaultMqClientName = 'mongo';

/**
 * Factory class to db client
 *
 * Required env
 * - DATABASE_CLIENT
 */
class dbClientFactory {
    static createClient() {
        const dbClientName = process.env.DATABASE_CLIENT || defaultMqClientName;
        if (!dbClientNames.includes(dbClientName)) {
            throw Error("DATABASE_CLIENT is invalid, use one of ['" + dbClientNames.join("', '") + "']");
        }
        return this[`create${_.upperFirst(dbClientName)}Client`]();
    }

    static createMongoClient(...props) {
        const { client } = require("./mongo");
        return new client(...props)
    }

    static createPostgresClient(...props) {
        const { client } = require("./postgres");
        return new client(...props)
    }
}

module.exports = {
    dbClientFactory
};
