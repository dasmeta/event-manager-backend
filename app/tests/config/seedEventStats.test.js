'use strict';

const { seedEventStatsRows, ZERO_STATS } = require('../../config/functions/seedEventStats');

jest.mock('../../helper/dbAdapter/dbClientFactory', () => ({
  dbClientFactory: {
    createClient: jest.fn(),
  },
}));

const { dbClientFactory } = require('../../helper/dbAdapter/dbClientFactory');

describe('seedEventStatsRows', () => {
  let createMock;

  beforeEach(() => {
    createMock = jest.fn().mockResolvedValue({});
    strapi.query = jest.fn((model) => {
      if (model === 'event-stats') {
        return {
          find: jest.fn().mockResolvedValue([
            { topic: 'existing.topic', subscription: 'existing_sub' },
          ]),
          create: createMock,
        };
      }
      return {};
    });

    dbClientFactory.createClient.mockReturnValue({
      getGroupedSubscriptions: jest.fn().mockResolvedValue([
        { _id: { topic: 'existing.topic', subscription: 'existing_sub' } },
        { _id: { topic: 'new.topic', subscription: 'new_sub' } },
      ]),
    });

    delete process.env.EVENT_STATS_SEED_PAIRS;
  });

  it('creates missing zero rows and skips existing pairs', async () => {
    const result = await seedEventStatsRows();

    expect(result).toEqual({ total: 2, created: 1 });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      topic: 'new.topic',
      subscription: 'new_sub',
      ...ZERO_STATS,
    });
  });

  it('merges optional EVENT_STATS_SEED_PAIRS from env', async () => {
    process.env.EVENT_STATS_SEED_PAIRS = JSON.stringify([
      { topic: 'env.topic', subscription: 'env_sub' },
    ]);

    const result = await seedEventStatsRows();

    expect(result.total).toBe(3);
    expect(result.created).toBe(2);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'env.topic', subscription: 'env_sub' })
    );
  });
});
