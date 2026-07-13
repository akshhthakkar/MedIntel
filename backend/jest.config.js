module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["./tests/setup.js"],
  testMatch: ["**/*.test.js"],
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  testTimeout: 30000,
  collectCoverageFrom: [
    "controllers/**/*.js",
    "services/**/*.js",
    "middleware/**/*.js",
    "routes/**/*.js",
  ],
  coverageThreshold: {
    global: {
      lines: 80,
    },
  },
};
