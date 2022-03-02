const { PubSub } = require("@google-cloud/pubsub/build/src/index");

class subscriptionAdapter {
    mqClient;

    constructor(subscription) {
        return this.subscription = subscription;
    }

    exists(...props) {
        return this.subscription.exists(...props);
    }

    create() {
        const topic = this.subscription.topic;
        const subscriptionName = this.subscription.name;
        
        return mqClient.createSubscription(topic, subscriptionName, {
            flowControl: {
                maxMessages: 1,
            },
            ackDeadlineSeconds: 60, // max 10 min
            // messageRetentionDuration: 4 * 60 * 60, // max 7 day
            // retainAckedMessages: true,
        });
    }

    getClientAdapter() {
        if(!this.mqClient) {
            this.mqClient = new clientAdapter();
        }
        return this.mqClient;
    }
}

class topicAdapter {
    constructor(topic) {
        this.topic = topic;
    }

    exists(...props) {
        return this.topic.exists(...props);
    }

    create(...props) {
        return this.topic.create(...props);
    }

    // subscription(...props) {
    //     return this.topic.subscription(...props)
    // }

    subscription(...props) {
        return new subscriptionAdapter(this.topic.subscription(...props));
    }

    publish(...props) {
        return this.topic.publish(...props)
    }
}

/**
 * Publisher Subscriber client adapter for GCLOUD
 *
 * Required env
 * - GCLOUD_PROJECT
 */
class clientAdapter {
    constructor(...props) {
        this.client = new PubSub({ projectId: process.env.GCLOUD_PROJECT, ...props })
    }

    topic(...props) {
        return new topicAdapter(this.client.topic(...props));
    }

    createSubscription(topic, ...props) {
        return this.client.createSubscription(topic.topic, ...props)
    }
}

module.exports = {
    clientAdapter
}