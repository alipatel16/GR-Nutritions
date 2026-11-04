module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  watchman: false,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/work/',
    '/functions/',
    '/supabase/',
    '<rootDir>/scripts/tests/',
  ],
};
