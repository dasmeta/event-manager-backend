module.exports = ({ env }) => {

  // if(!['mongo', 'postgres'].includes(env("DATABASE_CLIENT"))) {
  //   throw new Error('Wrong client specified');
  // }

  const client = env("DATABASE_CLIENT")

  return {
    defaultConnection: 'default',
    connections: {
      default: {
        connector: client === 'postgres' ? 'bookshelf' : 'mongoose',
        settings: {
          client,
          host: env('DATABASE_HOST', undefined),
          port: env.int('DATABASE_PORT', client === 'postgres' ? 5432 : 27017),
          database: env('DATABASE_NAME', undefined),
          username: env('DATABASE_USERNAME', undefined),
          password: env('DATABASE_PASSWORD', undefined),
          uri: env("DATABASE_URL"),
          autoIndex: false,
        },
        options: {
          authenticationDatabase: env('AUTHENTICATION_DATABASE', undefined),
          ssl: env.bool('DATABASE_SSL', undefined),
        },
      },
    },
  }
};