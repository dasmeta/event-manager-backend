module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/\\.cache/', '/build/', '/public/'],
  modulePathIgnorePatterns: ['<rootDir>/.cache/', '<rootDir>/build/'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  clearMocks: true,
};
