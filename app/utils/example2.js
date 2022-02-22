const { publish, subscribeMulti } = require("./src");

let count1s = 0;
let count1p = 0;

function subscribe1() {
    subscribeMulti("test", ["dev.test"], async (topic, data) => {
        count1s++;
        console.log("\x1b[31m%s %s\x1b[0m", " 1 ", topic, data, count1s, count1p);
    });
}

function subscribe2() {
    // resubscribe
    subscribeMulti("test", ["dev.test"], async (topic, data) => {
        console.log("\x1b[32m%s %s\x1b[0m", " 2 ", topic, data);
    });

    subscribeMulti("test3", ["dev.test", "dev.test.other"], async (topic, data) => {
        console.log("\x1b[33m%s %s\x1b[0m", " 3 ", topic, data);
    });
}

setInterval(async () => {
    count1p++;
    await publish("dev.test", { key: Date.now() });
}, 500);

setInterval(async () => {
    await publish("dev.test.other", { key2: Date.now() });
}, 300);

subscribe1();

setTimeout(async () => {
    subscribe2();
}, 3 * 1000);
