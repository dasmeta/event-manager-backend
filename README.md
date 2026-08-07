# Event Manager Backend (event-manager-backend)
Welcome to Event Manager Backend (event-manager-backend)

## Table of contents
 * [Introduction](#introduction)
 * [Requirements](#requirements)
 * [Installation](#installation)
 * [Configuration](#configuration)
 * [Troubleshooting & FAQ](#troubleshooting-faq)

## Introduction
The service is based on Strapi JS framework.

## Requirements
- CPU cores >= 1
- RAM >= 256MB
- [Git 2.*](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Docker 20.*](https://docs.docker.com/engine/install/)
  
## Installation
- Set up git to have ssh access to the repository
- Clone the source into local machine
```shell
$ git clone git@github.com:dasmeta/event-manager-backend.git
```
- Go to the project source `$ cd event-manager-backend`
- Run make with prefered configuration to start development environment.
- Run docker build to create a production ready image and install project dependencies.
```shell
$ docker build -t event-manager-backend:latest .
```

## Configuration
- Create an environment file `.env` and defined variables
```text
# Web Server
HOST=0.0.0.0
PORT=1337
SERVE_ADMIN_PANEL=

# Database

# mongo
DATABASE_CLIENT=mongo
DATABASE_URL=mongodb://strapi:strapi@mongo/strapi?authSource=admin
// or
DATABASE_HOST=strapi
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=strapi
DATABASE_NAME=strapi
AUTHENTICATION_DATABASE=admin

# postgres
DATABASE_CLIENT=postgres
DATABASE_HOST=postgres
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=strapi
DATABASE_NAME=strapi

# JWT settings to validate token
JWT_SECRET=
JWT_ALGORITHM="HS256"

# Centralized Authentication
AUTHENTICATION_SERVICE_API_HOST=
AUTHENTICATION_IS_LIVE_MODE=

# For aws lambda with sns trigger
MQ_CLIENT_NAME=SNS
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Optional publish / stats
# SANITIZE_KEYS=true
# PUBSUB_EVENTS_DATA_SOURCE=
# JWT_EXPIRATION=30d
# USE_OLD_CALCULATE=true
# SEED_EVENT_STATS_ON_START=false
# EVENT_STATS_SEED_PAIRS=[{"topic":"my.topic","subscription":"my_sub"}]
```
- Create and start a container ready to handle connections
```shell
$ make up-with-mongo 
$ make up-with-postgres
```
- The service will be accessible on http://0.0.0.0:8037

### Seed event-stats list on startup

On boot (in the background), the service creates missing `event-stats` rows with zeros from distinct pairs in `event_subscription` so the UI list is visible. Counts stay `0` until you use Calculate / Calculate single.

This is **on by default**. Disable with:

```
SEED_EVENT_STATS_ON_START=false
```

If `event_subscription` is also empty, optionally provide pairs explicitly:

```
EVENT_STATS_SEED_PAIRS=[{"topic":"my.topic","subscription":"my_sub"}]
```

(Alternatively keep using `emc platform:update-stats` from the project function configs.)

### If data retention following env variables should be defined
```
ENABLE_CRON=true
DATA_RETENTION_DAYS=40 // event that are created more than 40 days ago will be remove, but only those which have 100% success
DATA_CLEANUP_HOUR=04 // time in a day on which cleanup job will be executed, in UTC and 24 hour format 
```

With Postgres, retention works once these env vars are set (same as Mongo). Cron archives fully-succeeded events older than `DATA_RETENTION_DAYS`.

## Indexes

Performance indexes for `event` and `event_subscription` are **ensured automatically on startup** for both Mongo and Postgres via native `createIndex` / `CREATE INDEX` (see `app/helper/dbAdapter/indexes.js`). Collections/tables remain Strapi-managed.

First boot after an upgrade may take longer while indexes are built. Second boot is a no-op when indexes already match.

### Mongo reference (keys)

```
## event (collection / table)

{ entity: 1, entityId: 1 }
{ entity: 1, entityId: 1, createdAt: 1 },
{ topic: 1 }

## event_subscription (collection / table)

{ createdAt: -1 }
{ eventId: 1 }
{ eventId: 1, createdAt: 1 }
{ eventId: 1, subscription: 1 }
{ isError: 1 }
{ isError: 1, isPreconditionFail: 1, isSuccess: 1, updatedAt: 1 }
{ isPreconditionFail: 1 }
{ isSuccess: 1 }
{ subscription: 1 }
{ topic: 1 }
{ topic: 1, subscription: 1 }
{ topic: 1, subscription: 1, isError: 1, "error.message": 1, updatedAt: -1 }
{ topic: 1, subscription: 1, isError: 1, isPreconditionFail: 1, isSuccess: 1 }
{ topic: 1, subscription: 1, isError: 1, isPreconditionFail: 1, isSuccess: 1, createdAt: 1 }
{ topic: 1, subscription: 1, isSuccess: 1 }
{ topic: 1, subscription: 1, isError: 1, isPreconditionFail: 1, isSuccess: 1, "error.message": 1, createdAt: 1 }
```

### Postgres reference (equivalent)

```sql
-- event
CREATE INDEX "em_event_entity_entityId" ON "event" (entity, "entityId");
CREATE INDEX "em_event_entity_entityId_createdAt" ON "event" (entity, "entityId", created_at);
CREATE INDEX "em_event_topic" ON "event" (topic);

-- event_subscription
CREATE INDEX "em_es_createdAt" ON "event_subscription" (created_at DESC);
CREATE INDEX "em_es_eventId" ON "event_subscription" ("eventId");
CREATE INDEX "em_es_eventId_createdAt" ON "event_subscription" ("eventId", created_at);
CREATE INDEX "em_es_eventId_subscription" ON "event_subscription" ("eventId", subscription);
CREATE INDEX "em_es_isError" ON "event_subscription" ("isError");
CREATE INDEX "em_es_isError_isPF_isSuccess_updatedAt" ON "event_subscription" ("isError", "isPreconditionFail", "isSuccess", updated_at);
CREATE INDEX "em_es_isPreconditionFail" ON "event_subscription" ("isPreconditionFail");
CREATE INDEX "em_es_isSuccess" ON "event_subscription" ("isSuccess");
CREATE INDEX "em_es_subscription" ON "event_subscription" (subscription);
CREATE INDEX "em_es_topic" ON "event_subscription" (topic);
CREATE INDEX "em_es_topic_subscription" ON "event_subscription" (topic, subscription);
CREATE INDEX "em_es_topic_sub_isError_msg_updatedAt" ON "event_subscription" (topic, subscription, "isError", ((error->>'message')), updated_at DESC);
CREATE INDEX "em_es_topic_sub_isError_isPF_isSuccess" ON "event_subscription" (topic, subscription, "isError", "isPreconditionFail", "isSuccess");
CREATE INDEX "em_es_topic_sub_flags_createdAt" ON "event_subscription" (topic, subscription, "isError", "isPreconditionFail", "isSuccess", created_at);
CREATE INDEX "em_es_topic_subscription_isSuccess" ON "event_subscription" (topic, subscription, "isSuccess");
CREATE INDEX "em_es_topic_sub_flags_msg_createdAt" ON "event_subscription" (topic, subscription, "isError", "isPreconditionFail", "isSuccess", ((error->>'message')), created_at);
```

## API permissions

On startup, Strapi 3 **authenticated** role permissions for the allowlisted application APIs (UI + runtime SDK) are enabled automatically. Public stays locked except `healthcheck.check`. See `app/config/functions/ensurePermissions.js` to extend the allowlist. No Admin UI clicks are required for those routes.

## Troubleshooting & FAQ
- View service logs
```shell
$ docker logs -f --since 2m em-backend
```
- Run unit tests (Jest; mocked — no live DB required)
```shell
$ cd app && yarn test
# or inside the container:
$ docker exec em-backend bash -c "yarn test"
```

# pubSub

Extended event publishing PubSub/Kafka package.

`yarn add @dasmeta/event-manager-node-api`

### start local pub/sub

`$ gcloud beta emulators pubsub start`
`$ DATASTORE_EMULATOR_HOST=localhost:8432 DATASTORE_PROJECT_ID=YOUR_GCLOUD_PROJECT_ID gcloud beta emulators datastore start`



#### example1.js
```
const { registerSubscriber, publish } = require("@dasmeta/event-manager-node-api");

async function test1(data) {
    console.log("test1", data);
}

async function test2(data) {
    console.log("test2", data);
}

async function test3(data) {
    console.log("test3", data);
}

registerSubscriber("dev.test", "dev-test_test1", test1);
registerSubscriber("dev.test", "dev-test_test2", test2);
registerSubscriber("dev.test.other", "dev-test_test3", test3);

setInterval(async () => {
    await publish("dev.test", { key: Date.now() });
}, 300);

setInterval(async () => {
    await publish("dev.test.other", { key2: Date.now() });
}, 500);

```

`PUBSUB_EMULATOR_HOST="localhost:8085" PUBSUB_PROJECT_ID="YOUR_GCLOUD_PROJECT_ID" GCLOUD_PROJECT="YOUR_GCLOUD_PROJECT_ID" node example1.js`

#### example2.js
```
const { publish, subscribeMulti } = require("@dasmeta/event-manager-node-api");


function subscribe1() {
    subscribeMulti("test", ["dev.test", "dev.test.other"], async (topic, data) => {
        console.log('\x1b[31m%s %s\x1b[0m', " 1 ", topic, data);
    });
}

function subscribe2() {
    // resubscribe
    subscribeMulti("test", ["dev.test"], async (topic, data) => {
        console.log('\x1b[32m%s %s\x1b[0m', " 2 ", topic, data);
    });

    subscribeMulti("test3", ["dev.test", "dev.test.other"], async (topic, data) => {
        console.log('\x1b[33m%s %s\x1b[0m', " 3 ", topic, data);
    });
}


setInterval(async () => {
    await publish("dev.test", { key: Date.now() });
}, 200);

setInterval(async () => {
    await publish("dev.test.other", { key2: Date.now() });
}, 300);

subscribe1();

setTimeout(async () => {
    subscribe2();
}, 20 * 1000);

```

`PUBSUB_EMULATOR_HOST="localhost:8085" PUBSUB_PROJECT_ID="YOUR_GCLOUD_PROJECT_ID" GCLOUD_PROJECT="YOUR_GCLOUD_PROJECT_ID" node example2.js`

#### example3.js
```
import { autoStart as AutoStart, subscribe as on, publish } from "@dasmeta/event-manager-node-api";

@AutoStart
class Example {
    @on("dev.test")
    async test1(data) {
        console.log("test1", data);
    }

    @on("dev.test")
    async test2(data) {
        console.log("test2", data);
    }

    @on("dev.test.other")
    async test3(data) {
        console.log("test3", data);
    }
}

setInterval(async () => {
    await publish("dev.test", { key: Date.now() });
}, 300);

setInterval(async () => {
    await publish("dev.test.other", { key2: Date.now() });
}, 500);

```

`PUBSUB_EMULATOR_HOST="localhost:8085" PUBSUB_PROJECT_ID="YOUR_GCLOUD_PROJECT_ID" GCLOUD_PROJECT="YOUR_GCLOUD_PROJECT_ID" node example3.js`

#### Kafka : run all examples with env variables
`MQ_CLIENT_NAME='Kafka' KAFKA_BROKERS='127.0.0.1:29092'`

#### PubSub : run all examples with env variables
`PUBSUB_EMULATOR_HOST="localhost:8085" PUBSUB_PROJECT_ID="YOUR_GCLOUD_PROJECT_ID" GCLOUD_PROJECT="YOUR_GCLOUD_PROJECT_ID"`
