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
```
- Create and start a container ready to handle connections
```shell
$ make up-with-mongo 
$ make up-with-postgres
```
- The service will be accessible on http://0.0.0.0:8037

### If data retention following env variables should be defined
```
ENABLE_CRON=true
DATA_RETENTION_DAYS=40 // event that are created more than 40 days ago will be remove, but only those which have 100% success
DATA_CLEANUP_HOUR=04 // time in a day on which cleanup job will be executed, in UTC and 24 hour format 
```

## Indexes (MUST!!!)
For smooth performance set following indexes (written in mongo syntax, if using SQL databases must be changed accordingly)

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

## Troubleshooting & FAQ
- View service logs
```shell
$ docker logs -f --since 2m em-backend
```
- Run tests
```shell
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
