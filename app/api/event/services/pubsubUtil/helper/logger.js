const verbose = process.argv.includes("-v");

module.exports = {
    isSkip() {
        return process.env["DEV_SKIP_PUBLISH"];
    },
    isTest() {
        return process.env.NODE_ENV === "test";
    },
    isDebug() {
        return process.env.PUBLISH_DEBUG_MODE || !!verbose;
    },
    debug(...args) {
        console.debug(...args);
    },
    debugIfEnabled(...args) {
        if (module.exports.isDebug()) {
            module.exports.debug(...args);
        }
    },
    error(...args) {
        console.error(...args);
    },
    timeStart(label) {
        console.time(label);
    },
    timeEnd(label) {
        console.timeEnd(label);
    },
};
