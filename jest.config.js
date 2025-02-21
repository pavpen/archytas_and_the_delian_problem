/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // The 'examples' shipped with Three.js fail to be properly imported
    // by 'ts-jest'.  Since, we're not using them in our tests, we just
    // mock the imported modules:
    'three/examples/jsm/': '<rootDir>/test/mocks/jest_ignore_module.js'
  },
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  // transformIgnorePatterns: ['<rootDir>/node_modules/'],
};