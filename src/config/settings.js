var logger    = require('./logger');
var merge     = require('deepmerge');

var commonSettings = {};
var privateSettings = {};
var settingsByEnv = {};

var env = (process.env.NODE_ENV || 'dev').toLowerCase();

logger.info('CDAL is running on ' + env);

try {
  logger.info('Trying to read the common settings file');
  commonSettings = require('./settings.common');
  logger.info('Common settings file read successfully');
} catch (e) {
  logger.error('There is no common settings file to read', e);
}

try {
  logger.info('Trying to read the private settings file');
  privateSettings = require('./settings.private');
  logger.info('Private settings file read successfully');
} catch (e) {
  logger.warn('There is no private settings file to read');
}

try {
  logger.info('Trying to read the DEV settings file');
  settingsByEnv.dev = require('./settings.dev');
  logger.info('DEV settings file read successfully');
} catch (e) {
  logger.warn('There is no dev settings file to read');
}

try {
  logger.info('Trying to read the PRD settings file');
  settingsByEnv.prd = require('./settings.prd');
  logger.info('PRD settings file read successfully');
} catch (e) {
  logger.warn('There is no PRD settings file');
}

try {
  logger.info('Trying to read the TEST settings file');
  settingsByEnv.test = require('./settings.test');
  logger.info('TEST settings file read successfully');
} catch (e) {
  logger.warn('There is no TEST settings file');
}

var envinromentConfig = {};

if (settingsByEnv[env]) {
  envinromentConfig = settingsByEnv[env];
}

// merging common settings with private settings
var defaultConfig = merge(commonSettings, privateSettings);

// now merging default config with specifc enviroment config
defaultConfig = merge(defaultConfig, envinromentConfig);

logger.debug('CDAL is running using this configurations ', defaultConfig);

module.exports = defaultConfig;
