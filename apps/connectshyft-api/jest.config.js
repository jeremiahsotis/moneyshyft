module.exports = {
  testEnvironment: "node",
  roots: [
    "<rootDir>/src",
    "<rootDir>/../../domains/communication",
    "<rootDir>/../../infrastructure/communications",
    "<rootDir>/../../tests/integration/connectshyft-api",
    "<rootDir>/../../tests/integration/peoplecore",
  ],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.test.ts",
    "<rootDir>/../../domains/communication/**/__tests__/**/*.test.ts",
    "<rootDir>/../../infrastructure/communications/**/__tests__/**/*.test.ts",
    "<rootDir>/../../tests/integration/connectshyft-api/**/*.test.ts",
    "<rootDir>/../../tests/integration/peoplecore/**/*.test.ts",
  ],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  moduleFileExtensions: ["ts", "js", "json"],
  modulePaths: ["<rootDir>/node_modules"],
  clearMocks: true,

  // ✅ ADD THIS BLOCK (env must load BEFORE anything else)
  setupFiles: ["<rootDir>/jest.setup.env.ts"],

  // existing
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/jest.setup.ts"],

  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },
  transformIgnorePatterns: ["/node_modules/(?!uuid)/"],
  moduleNameMapper: {
    "^@shyft/contracts$": "<rootDir>/../../libs/contracts/src/index.ts",
    "^uuid$": "<rootDir>/src/__mocks__/uuid.ts",
  },
};
