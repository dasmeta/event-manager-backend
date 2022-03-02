module.exports = ({ env }) => ({
  // Centralized user provider service host
  AUTHENTICATION_SERVICE_API_HOST: env('AUTHENTICATION_SERVICE_API_HOST', null),
  // If true on each request user entity will be pulled from centralized user provider.
  AUTHENTICATION_IS_LIVE_MODE: env.bool('AUTHENTICATION_IS_LIVE_MODE', false)
})
