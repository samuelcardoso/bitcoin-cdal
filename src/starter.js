var settings            = require('./config/settings');
var WorkerFactory       = require('./workers/workerFactory');
var BOFactory           = require('./business/boFactory');
var logger              = require('./config/logger');

module.exports = function() {
  return {
    runWorkers: function() {
      return new Promise(function(resolve, reject) {
        var chain = Promise.resolve();
        var bosWorker = WorkerFactory.getWorker('bos');
        var aapmsWorker = WorkerFactory.getWorker('aapms');
        var tnsWorker = WorkerFactory.getWorker('tns');

        chain
          .then(function() {
            aapmsWorker.run();
            tnsWorker.run();
            bosWorker.run();
          })
          .then(resolve)
          .catch(reject);
      });
    },

    configureDefaultSettings: function() {
      logger.info('Creating default configurations to the system...');

      var configurationBO = BOFactory.getBO('configuration');

      var p = [];

      for (var property in settings.defaultSettings) {
        logger.info('Setting up the configuration ' + property + ' to ' + settings.defaultSettings[property]);
         p.push(configurationBO.initialize({
           key: property,
           value: settings.defaultSettings[property]
         }));
      }

      logger.info('All promises has been created');
      return Promise.all(p);
    },

    configureApplication: function() {
      var self = this;
      this.configureDefaultSettings()
        .then(function() {
          return self.runWorkers();
        })
        .catch(function() {
          logger.error('There was an error configuring the application');
        });
    }
  };
};
