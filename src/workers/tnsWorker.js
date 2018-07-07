var Promise         = require('promise');
var logger          = require('../config/logger');

module.exports = function(dependencies) {
  var transactionBO = dependencies.transactionBO;
  var requestHelper = dependencies.requestHelper;
  var configurationBO = dependencies.configurationBO;

  return {
    dependencies: dependencies,
    isRunning: false,

    run: function() {
      var self = this;

      if (!this.isRunning) {
        self.isRunning = true;

        return this.notifyConfirmedTransactions()
          .then(function() {
              self.isRunning = false;

              logger.debug('[TNSWorker.run()] A new verification will occurr in 10s');
              setTimeout(function() {
                self.run();
              }, 10 * 1000);
          });
      } else {
        logger.debug('[TNSWorker.run()] The process still running... this execution will be skiped');
      }
    },

    notifyConfirmedTransactions: function() {
      var chain = Promise.resolve();
      var transactions = null;
      var transactionNotificationAPI = null;

      return new Promise(function(resolve) {
        logger.debug('[TNSWorker.notifyConfirmedTransactions()] Starting Transaction Notifier Service');

        chain
          .then(function() {
            return configurationBO.getByKey('transactionNotificationAPI');
          })
          .then(function(r) {
            transactionNotificationAPI = r.value;

            logger.debug('[TNSWorker.notifyConfirmedTransactions()] Getting unnotified transactions from database');
            return transactionBO.getTransactionsToNotify();
          })
          .then(function(r) {
            logger.debug('[TNSWorker.notifyConfirmedTransactions()] Returned unnotified transactions from database', JSON.stringify(r));
            transactions = r;
            var p = [];

            logger.debug('[TNSWorker.notifyConfirmedTransactions()] Sending the notifications about transactions');

            for (var i = 0; i < transactions.length; i++) {
              logger.debug('[TNSWorker] Notifiyng about the transaction', transactions[i]);
              var notificationPromise = new Promise(function(resolve) {
                requestHelper.postJSON(
                  transactionNotificationAPI,
                  [],
                  transactions[i],
                  [200])
                  .then(function(){
                    resolve({isError: false});
                  })
                  .catch(function(e) {
                    resolve({isError: true, error: e});
                  });
              });
              p.push(notificationPromise);
            }

            return Promise.all(p);
          })
          .then(function(r) {
            var p = [];

            logger.debug('[TNSWorker.notifyConfirmedTransactions()] Updating the flag is notified for the transactions', transactions.length);

            for (var i = 0; i < transactions.length; i++) {
              if (!r[i].isError) {
                if (!transactions[i].notifications.creation.isNotified) {
                  logger.debug('[TNSWorker.notifyConfirmedTransactions()] Updating the flag notifications.confirmation.isNotified for the transaction', transactions[i].id);
                  p.push(transactionBO.updateIsCreationNotifiedFlag(transactions[i].id));
                } else {
                  logger.debug('[TNSWorker.notifyConfirmedTransactions()] Updating the flag notifications.confirmation.isNotified for the transaction', transactions[i].id);
                  p.push(transactionBO.updateIsConfirmationNotifiedFlag(transactions[i].id));
                }
              } else {
                logger.debug('[TNSWorker.notifyConfirmedTransactions()] The notification has failed to ', transactionNotificationAPI, transactions[i].id, r[i].error);
              }
            }

            logger.debug('[TNSWorker.notifyConfirmedTransactions()] Returning promises', p.length);
            return Promise.all(p);
          })
          .then(function() {
            logger.debug('[TNSWorker.notifyConfirmedTransactions()] A new verification will occurr in 10s');
            resolve(true);
          })
          .catch(function(r) {
            logger.error('[TNSWorker.notifyConfirmedTransactions()] An error has occurred while notifying unnotified transactions', JSON.stringify(r));
            resolve(true);
          });
      });
    }
  };
};
