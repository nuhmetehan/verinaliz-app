module.exports = ({ config, staticConfigPath }) =>
  staticConfigPath ? config : require('./app.example.json').expo;
