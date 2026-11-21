const verifyReleaseEnvironment = require('./scripts/verify-release-env.cjs');

module.exports = ({ config, staticConfigPath }) => {
  if (process.env.EAS_BUILD_PROFILE === 'production') {
    verifyReleaseEnvironment(process.env);
  }
  return staticConfigPath ? config : require('./app.example.json').expo;
};
