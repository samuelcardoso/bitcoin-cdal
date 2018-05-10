var Promise         = require('promise');
var logger          = require('../config/logger');

module.exports = function(dependencies) {
  var configurationBO = dependencies.configurationBO;
  var addressBO = dependencies.addressBO;
  var daemonHelper = dependencies.daemonHelper;

  return {
    dependencies: dependencies,

    run: function() {
      var self = this;

      logger.info('[AAPMSWorker] Starting the process to maintain the pool');

      return new Promise(function(resolve, reject) {
        var chain = Promise.resolve();

        chain
          .then(function() {
            logger.info('[AAPMSWorker] Starting the process to synchronize the addresses');
            return self.synchronizeAddresses();
          })
          .then(function() {
            logger.info('[AAPMSWorker] Starting the process to keep to pool full');
            return self.maintainPool();
          })
          .then(resolve)
          .catch(reject);
      });
    },

    synchronizeAddresses: function() {
      return new Promise(function(resolve, reject) {
        var chain = Promise.resolve();
        var addresses = [];

        logger.info('[AAPMSWorker] Synchroninzing to daemon addresses');
        chain
          .then(function() {
            logger.info('[AAPMSWorker] Getting daemon available addresses');
            return daemonHelper.getAddresses();
          })
          .then(function(r) {
            addresses = r;
            var p = [];

            logger.debug('[AAPMSWorker] Daemon available addresses', JSON.stringify(addresses));
            for (var i = 0; i < addresses.length; i++) {
              logger.info('[AAPMSWorker] Checking if the address exists at database', JSON.stringify(addresses[i]));
              p.push(addressBO.getByAddress(null, addresses[i]));
            }

            logger.debug('[AAPMSWorker] Returning promises', p.length);
            return Promise.all(p);
          })
          .then(function(r) {
            var p = [];

            for (var i = 0; i < r.length; i++) {
              if (!r[i]) {
                logger.info('[AAPMSWorker] The address does not exist at database, it will be stored', JSON.stringify(addresses[i]));
                p.push(addressBO.registerAddressFromDaemon(null, addresses[i]));
              }
            }

            logger.debug('[AAPMSWorker] Returning promises', p.length);
            return Promise.all(p);
          })
          .then(resolve)
          .catch(function(r) {
            logger.error('[AAPMSWorker] An error has occurred while synchronizing addresses');
            reject(r);
          });
      });
    },

    maintainPool: function() {
      return new Promise(function(resolve, reject) {
        var chain = Promise.resolve();
        var minimumAddressPoolSize = 0;

        chain
          .then(function() {
            logger.info('[AAPMSWorker] Getting the minimum size for the pool');
            return configurationBO.getByKey('minimumAddressPoolSize');
          })
          .then(function(r) {
            logger.info('[AAPMSWorker] The minimum size for the pool is ', r.value);
            minimumAddressPoolSize = r.value;
          })
          .then(function() {
            logger.info('[AAPMSWorker] Listing free addresses from database');
            return addressBO.getFreeAddresses();
          })
          .then(function(r) {
            var diff = minimumAddressPoolSize - r.length;
            var p = [];

            if (diff > 0) {
              logger.info('[AAPMSWorker] Total of addresses to be created to keep the pool consistent', diff);
              for (var i = 0; i < diff; i++) {
                p.push(addressBO.createAddressFromDaemon());
              }
            } else {
              logger.info('[AAPMSWorker] The pool is ok no address is needed to be created');
            }

            return Promise.all(p);
          })
          .then(function(r) {
            logger.info('[AAPMSWorker] All the addresses was created successfully');
            logger.debug(JSON.stringify(r));
          })
          .then(resolve)
          .catch(function(r){
            logger.error('[AAPMSWorker] An error has occurred while maintaining the pool');
            reject(r);
          });
      });
    }
  };
};
