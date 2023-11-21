module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', '93cb7d5257c38f97bf5910da1c539f6c'),
    },
    serveAdminPanel: env.bool('SERVE_ADMIN_PANEL', false)
  },
  cron: {
    enabled: env.bool('ENABLE_CRON', false)
  }
});
