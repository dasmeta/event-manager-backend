'use strict';

global.strapi = {
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
  connections: {
    default: null,
  },
  query: jest.fn(),
};
