'use strict'

const { MongoClient } = require("mongodb");
const EventEmitter = require("events");

class ConnectionEmitter extends EventEmitter {}
const connectionEmitter = new ConnectionEmitter();

const state = {
    waiting: false,
    connection: null,
};

const getConnection = async () => {
    if (state.connection) {
        return state.connection;
    }
    if (state.waiting) {
        return new Promise(resolve => {
            connectionEmitter.setMaxListeners(connectionEmitter.getMaxListeners() + 1);
            connectionEmitter.once("connected", () => {
                resolve(state.connection);
                connectionEmitter.setMaxListeners(Math.max(connectionEmitter.getMaxListeners() - 1, 0));
            });
        });
    }
    state.waiting = true;

    const { username, password, host, port, database } = strapi.config.database.connections.default.settings;
    const authSource = strapi.config.database.connections.default.options.authenticationDatabase || 'admin'
    const url = `mongodb://${username || password ? `${username}:${password}@` : ""}${host}:${port}/${database}?authSource=${authSource}`;

    const connection = await MongoClient.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    state.connection = connection;
    state.waiting = false;
    connectionEmitter.emit("connected");
    return connection;
};

const getDb = async () => {
    const connection = await getConnection();
    return connection.db(strapi.config.database.connections.default.settings.database);
};

module.exports = {
    async getCollection(name) {
        const db = await getDb();
        return db.collection(name);
    },
};
