var Promise         = require('promise');
var settings        = require('../config/settings');
var logger          = require('../config/logger');

module.exports = function(dependencies) {
  var transactionBO = dependencies.transactionBO;
  var daemonHelper = dependencies.daemonHelper;
  var configurationBO = dependencies.configurationBO;

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

              logger.debug('[BOSWorker.run()] A new verification will occurr in 10s');
              setTimeout(function() {
                self.run();
              }, 10 * 1000);
          });
      } else {
        logger.debug('[BOSWorker.run()] The process still running... this execution will be skiped');
      }
    },

    parseTransactionsFromDaemon: function(r) {
      var p = [];
      logger.debug('[BOSWorker.parseTransactionsFromDaemon()] Total of blockchain transactions', r.transactions.length);

      for (var i = 0; i < r.transactions.length; i++) {
        if (!(r.transactions[i].trusted === false)) {
          if (r.transactions[i].category === 'send' || r.transactions[i].category === 'receive' ) {
            logger.debug('[BOSWorker.parseTransactionsFromDaemon()] Parsing the transaction', r.transactions[i].txid, JSON.stringify(r.transactions[i]));

            var pTransaction = new Promise(function(resolve) {
              var tmp = r.transactions[i];
              transactionBO.parseTransaction(tmp)
                .then(resolve)
                .catch(resolve);
            });
            p.push(pTransaction);
          } else {
            logger.debug('[BOSWorker.parseTransactionsFromDaemon()] Ignoring the transaction', r.transactions[i].txid, JSON.stringify(r.transactions[i]));
          }
        } else {
          logger.debug('[BOSWorker.parseTransactionsFromDaemon()] The transaction is not trusted', r.transactions[i].txid, JSON.stringify(r.transactions[i]));
        }
      }

      logger.debug('[BOSWorker.parseTransactionsFromDaemon()] Returning promises', p.length);
      return Promise.all(p);
    },

    synchronizeFromBlock: function(block) {
      var self = this;

      return new Promise(function(resolve, reject) {
        var chain = Promise.resolve();

        chain
          .then(function() {
            logger.debug('[BOSWorker.synchronizeFromBlock()] Getting the block hash linked to this block number', block);
            return daemonHelper.getBlockHash(block);
          })
          .then(function(r) {
            logger.debug('[BOSWorker.synchronizeFromBlock()] Geeting transactions since block', r);
            return daemonHelper.listSinceBlock(r);
          })
          .then(function(r) {
            logger.debug('[BOSWorker.synchronizeFromBlock()] Transactions from blockchain', r.transactions.length);
            return self.parseTransactionsFromDaemon(r);
          })
          .then(resolve)
          .catch(reject);
      });
    },

    synchronizeToBlockchain: function() {
      var self = this;
      var chain = Promise.resolve();
      var currentBlockNumber = null;
      var initialCurrentBlockNumber = null;
      var blockCount = null;

      return new Promise(function(resolve) {
        logger.debug('[BOSWorker.synchronizeToBlockchain()] Starting Blockchain Observer Service');

        return chain
          .then(function() {
            logger.debug('[BOSWorker.synchronizeToBlockchain()] Getting current block number');
            return configurationBO.getByKey('currentBlockNumber');
          })
          .then(function(r) {
            currentBlockNumber = parseInt(r.value);
            initialCurrentBlockNumber = currentBlockNumber;
            logger.debug('[BOSWorker.synchronizeToBlockchain()] Getting the block count from daemon');
            return daemonHelper.getBlockCount();
          })
          .then(function(r) {
            blockCount = r;
            logger.debug('[BOSWorker.synchronizeToBlockchain()] The current block number is', currentBlockNumber);
            logger.debug('[BOSWorker.synchronizeToBlockchain()] The current blockcount is', r);
            currentBlockNumber -= settings.daemonSettings.previousBlocksToCheck;

            if (currentBlockNumber < 0) {
              currentBlockNumber = 0;
            }

            return self.synchronizeFromBlock(currentBlockNumber);
          })
          .then(function() {
            currentBlockNumber = initialCurrentBlockNumber + settings.daemonSettings.previousBlocksToCheck;
            logger.debug('[BOSWorker.synchronizeToBlockchain()] currentBlockNumber, blockCount, currentBlockNumber > blockCount',
                          currentBlockNumber,
                          blockCount,
                          currentBlockNumber > blockCount);

            if (currentBlockNumber > blockCount) {
              currentBlockNumber = blockCount;
            }

            logger.debug('[BOSWorker.synchronizeToBlockchain()] Updating currentBlockNumber to ', currentBlockNumber);

            return configurationBO.update({key:'currentBlockNumber', value: currentBlockNumber});
          })
          .then(function() {
            logger.debug('[BOSWorker.synchronizeToBlockchain()] Blockchain Observer Service has finished this execution');
            return true;
          })
          .then(resolve)
          .catch(function(r) {
            logger.error('[BOSWorker.synchronizeToBlockchain()] An error has occurred whiling synchronizing to daemon', r);
            //even if a error has occurred the process must continue
            resolve(false);
          });
      });
    }
  };
};
