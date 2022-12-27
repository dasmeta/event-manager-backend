module.exports = ({ env }) => {

  if(!['mongo', 'postgres'].includes(env("DATABASE_CLIENT"))) {
    throw new Error('Wrong client specified');
  }

  const client = env("DATABASE_CLIENT")

  return {
    defaultConnection: 'default',
    connections: {
      default: {
        connector: client === 'postgres' ? 'bookshelf' : 'mongoose',
        settings: {
          client,
          host: env('DATABASE_HOST', 'mongo'),
          port: env.int('DATABASE_PORT', client === 'postgres' ? 5432 : 27017),
          database: env('DATABASE_NAME', 'strapi'),
          username: env('DATABASE_USERNAME', 'strapi'),
          password: env('DATABASE_PASSWORD', 'strapi'),
          uri: env("DATABASE_URL"),
          ssl: env("DATABASE_SSL", false),
          autoIndex: false,
        },
        options: {
          // authenticationDatabase: env('AUTHENTICATION_DATABASE', null),
          // ssl: env.bool('DATABASE_SSL', false),
          // autoIndex: false,
        },
      },
    },
  }
};
