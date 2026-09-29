/** @type {import('jest').Config} */
export default {
    testEnvironment: "jsdom",
    extensionsToTreatAsEsm: [".ts", ".tsx"],
    // Source files import relative modules with an explicit ".js" extension
    // (required for Node ESM resolution), but the files on disk are ".ts".
    // Strip the extension here so Jest's resolver finds the real file.
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                useESM: true,
                tsconfig: "tsconfig.test.json",
            },
        ],
    },
    testMatch: ["<rootDir>/tests/**/*.test.ts?(x)"],
    setupFilesAfterEnv: ["<rootDir>/tests/setupTests.ts"],
};
