const { registerSubscriber, publish } = require("./src");

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
