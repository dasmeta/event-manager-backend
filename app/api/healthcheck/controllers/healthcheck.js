'use strict';

module.exports = {
  check: async () => {
    // const { instance } = strapi.mongoose;
    // if (!instance.connections.every(connection => [1, 2].includes(connection.readyState))) {
    //   throw new Error('not stable connection');
    // }

    return 'OK';
  },
};
