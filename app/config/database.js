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
          uri: env("DATABASE_URL"),
          // autoIndex: false,
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
