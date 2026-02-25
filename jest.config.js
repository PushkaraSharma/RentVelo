module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^expo-sqlite$': '<rootDir>/tests/__mocks__/expo-sqlite.ts',
        '^expo-file-system$': '<rootDir>/tests/__mocks__/expo-file-system.ts',
        '^react-native$': '<rootDir>/tests/__mocks__/react-native.ts',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
    },
    transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|expo|@expo|drizzle-orm)/)',
    ],
};
