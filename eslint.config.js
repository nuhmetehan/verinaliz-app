// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // Production bundle'a console.log/warn sızmasını engeller; yalnızca console.error'a izin ver
      'no-console': ['warn', { allow: ['error'] }],
    },
  },
]);
