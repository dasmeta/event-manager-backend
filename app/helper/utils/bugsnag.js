const bugsnag = require("@bugsnag/js");
const { version } = require("../../package");

const bugsnagClient = bugsnag({
    apiKey: process.env.MICROSERVICE_BUGSNAG_KEY || 'dummy',
    appVersion: version,
    releaseStage: process.env.NODE_ENV || "development",
});

module.exports = bugsnagClient;
