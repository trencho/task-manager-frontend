// Configured explicitly rather than through '@vue/cli-plugin-unit-jest'. That preset is
// pinned to the Jest 27 era and is what dragged jsdom@16 -> http-proxy-agent@4 ->
// @tootallnate/once into the tree. `npm test` calls jest directly, so the plugin bought
// nothing but its dependency chain.
module.exports = {
    moduleFileExtensions: ['js', 'json', 'vue'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    testEnvironment: 'jsdom',
    testMatch: ['<rootDir>/src/tests/**/*.spec.js'],
    transform: {
        '^.+\\.vue$': '@vue/vue3-jest',
        '^.+\\.js$': 'babel-jest'
    }
};
