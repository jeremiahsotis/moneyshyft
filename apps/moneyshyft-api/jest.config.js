module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/src/modules/connectshyft/__tests__/',
    '<rootDir>/src/routes/api/v1/__tests__/connectshyft\\.(?!route-ownership).*\\.test\\.ts$',
  ],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  modulePaths: ['<rootDir>/node_modules'],
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/jest.setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  transformIgnorePatterns: ['/node_modules/(?!uuid)/'],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/src/__mocks__/uuid.ts',
  },
};
