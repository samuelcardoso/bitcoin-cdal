var Promise         = require('promise');
var logger          = require('../config/logger');

module.exports = function(dependencies) {
  var transactionBO = dependencies.transactionBO;
  var configurationBO = dependencies.configurationBO;
  var daemonHelper = dependencies.daemonHelper;

  return {
    dependencies: dependencies,
    isRunning: false,

    run: function() {
      var self = this;

      if (!this.isRunning) {
        self.isRunning = true;

        return this.synchronizeToBlockchain()
          .then(function() {
              self.isRunning = false;

              logger.info('[BOSWorker] A new verification will occurr in 10s');
              setTimeout(function() {
                self.run();
              }, 10 * 1000);
          });
      } else {
        logger.info('[BOSWorker] The process still running... this execution will be skiped');
      }
    },

    parseTransactionsFromDaemon: function(r) {
      var p = [];
      logger.info('[BOSWorker] Total of blockchain transactions', r.transactions.length);

      for (var i = 0; i < r.transactions.length; i++) {
        logger.info('[BOSWorker] Parsing the transaction', JSON.stringify(r.transactions[i]));
        p.push(transactionBO.parseTransaction(r.transactions[i]));
      }

      logger.debug('[BOSWorker] Returning promises', p.length);
      return Promise.all(p);
    },

    synchronizeToBlockchain: function() {
      var self = this;
      var chain = Promise.resolve();
      var minimumConfirmations = 0;

      return new Promise(function(resolve) {
        logger.info('[BOSWorker] Starting Blockchain Observer Service');

        return chain
          .then(function() {
            logger.info('[BOSWorker] Getting the minimumConfirmations key');
            return configurationBO.getByKey('minimumConfirmations');
          })
          .then(function(r) {
            logger.info('[BOSWorker] The minimumConfirmations is', JSON.stringify(r));
            minimumConfirmations = parseInt(r.value);

            logger.info('[BOSWorker] Getting the block count from daemon');
            return daemonHelper.getBlockCount();
          })
          .then(function(r) {
            logger.info('[BOSWorker] The current blockcount is', r);
            r -= minimumConfirmations;

            if (r < 0) {
              r = 0;
            }

            logger.info('[BOSWorker] Getting the block hash linked to this block number', r);
            return daemonHelper.getBlockHash(r);
          })
          .then(function(r) {
            logger.info('[BOSWorker] Geeting transactions since block', r);
            return daemonHelper.listSinceBlock(r);
          })
          .then(function(r) {
            logger.info('[BOSWorker] Transactions from blockchain', r.transactions.length);
            return self.parseTransactionsFromDaemon(r);
          })
          .then(function() {
            logger.info('[BOSWorker] Blockchain Observer Service has finished this execution');
            return true;
          })
          .then(resolve)
          .catch(function(r) {
            logger.error('[BOSWorker] An error has occurred whiling synchronizing to daemon', JSON.stringify(r));
            //even if a error has occurred the process must continue
            resolve(true);
          });
      });
    }
  };
};
