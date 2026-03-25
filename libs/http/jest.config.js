const path = require('path');

module.exports = {
  displayName: 'http',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': [path.join(__dirname, '../../apps/admin-api/node_modules/ts-jest'), {
      tsconfig: '<rootDir>/tsconfig.json',
    }],
  },
};
