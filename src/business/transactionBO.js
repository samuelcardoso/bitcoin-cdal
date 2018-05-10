var Promise         = require('promise');
var logger          = require('../config/logger');

module.exports = function(dependencies) {
  var transactionDAO = dependencies.transactionDAO;
  var transactionRequestDAO = dependencies.transactionRequestDAO;
  var blockchainTransactionDAO = dependencies.blockchainTransactionDAO;
  var modelParser = dependencies.modelParser;
  var daemonHelper = dependencies.daemonHelper;
  var addressBO = dependencies.addressBO;
  var dateHelper = dependencies.dateHelper;

  return {
    dependencies: dependencies,

    clear: function() {
      return new Promise(function(resolve, reject) {
        var chain = Promise.resolve();

        chain
          .then(function() {
            logger.info('[TransactionBO] Clearing the database');
            return transactionDAO.clear();
          })
          .then(function() {
            logger.info('[TransactionBO] The database has been cleared');
          })
          .then(resolve)
          .catch(reject);
      });
    },

    getAll: function(filter) {
      return new Promise(function(resolve, reject) {
        if (!filter) {
          filter = {};
        }

        logger.info('[TransactionBO] Listing all transactions by filter ', JSON.stringify(filter));
        transactionDAO.getAll(filter)
          .then(function(r) {
            logger.info('[TransactionBO] Total of transactions', r.length);
            return r.map(function(item) {
              return modelParser.clear(item);
            });
          })
          .then(resolve)
          .catch(reject);
      });
    },

    getTransactionsToNotify: function() {
      var self = this;

      return new Promise(function(resolve, reject) {
        var filter = {
          '$or': [
            {
              'notifications.creation.isNotified': false
            },
            {
              isConfirmed: true,
              'notifications.confirmation.isNotified': false
            }
          ]

        };
        var chain = Promise.resolve();

        chain
          .then(function() {
            logger.info('[TransactionBO] Listing all transactions to be notified', JSON.stringify(filter));
            return self.getAll(filter);
          })
          .then(resolve)
          .catch(reject);
      });
    },

    getBlockchainTransactionByTransaction: function(filter) {
      var self = this;
      return new Promise(function(resolve, reject) {
        var chain = Promise.resolve();

        chain
          .then(function() {
            return self.getAll(filter);
          })
          .then(function(r) {
            if (r.length === 1) {
              return blockchainTransactionDAO.getByTransactionHash(r[0].transactionHash);
            } else {
              return null;
            }
          })
          .then(function(r) {
            if (r) {
              return modelParser.clear(r);
            } else {
              return null;
            }
          })
          .then(resolve)
          .catch(reject);
      });
    },

    getByTransactionHash: function(transactionHash) {
      return new Promise(function(resolve, reject) {
        var filter = {
          transactionHash: transactionHash,
        };

        transactionDAO.getAll(filter)
          .then(function(transactions) {
            if (transactions.length) {
              logger.info('[TransactionBO] Transaction found by transactionHash', JSON.stringify(transactions[0]));
              return transactions[0];
            } else {
              logger.info('[TransactionBO] Transaction not found by transactionHash', transactionHash);
              return null;
            }
          })
          .then(resolve)
          .catch(reject);
      });
    },

    getTransactionRequestByTransactionHash: function(transactionHash) {
      return new Promise(function(resolve, reject) {
        var filter = {
          transactionHash: transactionHash,
        };

        transactionRequestDAO.getAll(filter)
          .then(function(transactions) {
            if (transactions.length) {
              logger.info('[TransactionBO] Transaction request found by transactionHash', JSON.stringify(transactions[0]));
              return transactions[0];
            } else {
              logger.info('[TransactionBO] Transaction request not found by transactionHash', transactionHash);
              return null;
            }
          })
          .then(resolve)
          .catch(reject);
      });
    },

    save: function(entity) {
      var self = this;
      var chain = Promise.resolve();

      return new Promise(function(resolve, reject) {
        var transactionRequest = entity;
        var blockchainTransaction = null;

        return chain
          .then(function() {
            transactionRequest.status = 0;
            transactionRequest.createdAt = dateHelper.getNow();
            transactionRequest.commentTo = transactionRequest.from + '@' + transactionRequest.to;

            logger.info('[TransactionBO] Saving the transaction request', JSON.stringify(transactionRequest));
            return transactionRequestDAO.save(transactionRequest);
          })
          .then(function(r) {
            transactionRequest._id = r._id;
            logger.info('[TransactionBO] Sending the transaction to the blockchain', JSON.stringify(transactionRequest));
            return daemonHelper.sendTransaction(
                transactionRequest.to,
                transactionRequest.amount,
                transactionRequest.comment,
                transactionRequest.from + '@' + entity.to
              );
          })
          .then(function(r) {
            logger.debug('[TransactionBO] Return of blockchain', JSON.stringify(r));

            transactionRequest.status = 1;
            transactionRequest.transactionHash = r;
            transactionRequest.updatedAt = dateHelper.getNow();

            logger.info('[TransactionBO] Updating the transaction request ', JSON.stringify(transactionRequest));

            return transactionRequestDAO.update(transactionRequest);
          })
          .then(function(){
            logger.info('[TransactionBO] Getting transaction information by transactionHash', transactionRequest.transactionHash);
            return daemonHelper.getTransaction(transactionRequest.transactionHash);
          })
          .then(function(r) {
            blockchainTransaction = r;
            logger.debug('[TransactionBO] Return of blockchain', JSON.stringify(r));

            transactionRequest.fee = -r.fee;
            transactionRequest.updatedAt = dateHelper.getNow();

            logger.info('[TransactionBO] Updating the transaction request ', JSON.stringify(transactionRequest));
            return transactionRequestDAO.update(transactionRequest);
          })
          .then(function(r) {
            console.log(r);
            transactionRequest = modelParser.clear(r);
            return addressBO.withdraw(transactionRequest.from, transactionRequest.amount + transactionRequest.fee, 1);
          })
          .then(function() {
            return addressBO.getByAddress(null, transactionRequest.from);
          })
          .then(function(r) {
            if (r) {
              return addressBO.deposit(r.address, transaction.amount, 1);
            }
          })
          .then(function(){
            return transactionRequest;
          })
          .then(resolve)
          .catch(reject);
      });
    },

    getBlockchainTransactionByTXID: function(txid) {
      return new Promise(function(resolve, reject) {
        var filter = {
          txid: txid,
        };

        blockchainTransactionDAO.getAll(filter)
          .then(function(transactions) {
            if (transactions.length) {
              logger.info('[TransactionBO] Blockchain transaction found by txid', JSON.stringify(transactions[0]));
              return transactions[0];
            } else {
              logger.info('[TransactionBO] Blockchain transaction not found by txid', txid);
              return null;
            }
          })
          .then(resolve)
          .catch(reject);
      });
    },

    updateBlockchainTransaction: function(transaction, blockchainTransaction) {
      return new Promise(function(resolve, reject) {
        var chain = Promise.resolve();
        var rBlockchainTransaction = null;

        chain
          .then(function() {
            transaction.blockIndex = blockchainTransaction.blockIndex;
            transaction.timestamp = blockchainTransaction.timestamp;
            transaction.updatedAt = dateHelper.getNow();

            return blockchainTransactionDAO.update(transaction);
          })
          .then(function(r) {
            rBlockchainTransaction = r;
            return transactionDAO.updateTransactionInfo(blockchainTransaction.transactionHash,
              blockchainTransaction.blockIndex,
              blockchainTransaction.timestamp);
          })
          .then(function() {
            return rBlockchainTransaction;
          })
          .then(resolve)
          .catch(reject);
      });
    },

    createBlockchainTransaction: function(blockchainTransaction) {
      var self = this;

      return new Promise(function(resolve, reject) {
        var chain = Promise.resolve();
        var transactionRequest = null;
        var addressesAmount = {};
        var rBlockchainTransaction = null;

        chain
          .then(function() {
            logger.info('[TransactionBO] Trying to find the transaction request linked to this transactionHash',
              blockchainTransaction.transactionHash);
            return self.getTransactionRequestByTransactionHash(blockchainTransaction.transactionHash);
          })
          .then(function(r) {
            transactionRequest = r;

            if (!r) {
              logger.info('[TransactionBO] There is no transaction request linked to this transactionHash',
                blockchainTransaction.transactionHash);
            } else {
              logger.info('[TransactionBO] Transaction request linked to this transactionHash was found',
                blockchainTransaction.transactionHash);
            }

            var o = modelParser.prepare(blockchainTransaction, true);
            o.createdAt = dateHelper.getNow();
            o.isConfirmed = false;

            logger.info('[TransactionBO] Saving the blockchain transaction', JSON.stringify(o));

            return blockchainTransactionDAO.save(o);
          })
          .then(function(r) {
            rBlockchainTransaction = r;
            logger.info('[TransactionBO] Calculating the transaction for each transfer', JSON.stringify(rBlockchainTransaction));

            for (var i = 0; i < blockchainTransaction.transfers.length; i++) {
              var address = blockchainTransaction.transfers[i].address;

              if (address) {
                if (addressesAmount[address] !== undefined) {
                  addressesAmount[address].amount += blockchainTransaction.transfers[i].amount;
                } else {
                  addressesAmount[address] = {
                    amount: blockchainTransaction.transfers[i].amount,
                    address: address
                  };
                }
              }
            }

            logger.info('[TransacionBO] The amount for each address was calculated', JSON.stringify(addressesAmount));

            return;
          })
          .then(function() {
            var p = [];

            logger.info('[TransactionBO] Trying to find the address at database to get the ownerId');
            for (var address in addressesAmount) {
              p.push(addressBO.getByAddress(null, address));
            }

            logger.debug('[TransactionBO] Returning promises', p.length);
            return Promise.all(p);
          })
          .then(function(r) {
            var p = [];

            for (var i = 0; i < r.length; i++) {
              if (r[i]) {
                logger.info('[TransactionBO] The address was fount at database', JSON.stringify(r[i]));
                addressesAmount[r[i].address].ownerId = r[i].ownerId;
                addressesAmount[r[i].address].found = true;
              } else {
                logger.info('[TransactionBO] There is no address at the database for the specified address at transfer index ', i);
              }
            }

            logger.debug('[TransactionBO] Returning promises', r.length);
            return Promise.all(p);
          })
          .then(function() {
            var p = [];

            for (var address in addressesAmount) {
              if (addressesAmount[address].found) {
                logger.info('[TransactionBO] Saving the transaction', JSON.stringify(addressesAmount[address]));
                p.push(transactionDAO.save({
                  ownerId: addressesAmount[address].ownerId,
                  ownerTransactionId: transactionRequest ? transactionRequest.ownerTransactionId : null,
                  amount: addressesAmount[address].amount,
                  isConfirmed: false,
                  notifications: {
                    creation: {
                      isNotified: false
                    },
                    confirmation: {
                      isNotified: false
                    },
                  },
                  timestamp: blockchainTransaction.timestamp,
                  blockIndex: blockchainTransaction.blockIndex,
                  transactionHash: blockchainTransaction.transactionHash,
                  address: addressesAmount[address].address,
                  paymentId: blockchainTransaction.paymentId,
                  createdAt: dateHelper.getNow()
                }));
              } else {
                logger.warn('[TransactionBO] The transaction for the address will be ignored', JSON.stringify(addressesAmount[address]));
              }
            }

            logger.debug('[TransactionBO] Returning promises', p.length);
            return Promise.all(p);
          })
          .then(function() {
            console.log(rBlockchainTransaction);
            return modelParser.clear(rBlockchainTransaction);
          })
          .then(resolve)
          .catch(reject);
      });
    },

    parseTransaction: function(transaction) {
      var self = this;

      return new Promise(function(resolve, reject) {
        var chain = Promise.resolve();

        chain
          .then(function() {
            logger.info('[TransactionBO] Trying to get the blockchain transaction from database ', transaction.transactionHash);
            return self.getBlockchainTransactionByTXID(transaction.transactionHash);
          })
          .then(function(r) {
            if (r) {
              logger.info('[TransactionBO] The transaction was found. Blockindex and timestamp will be updated',
                transaction.transactionHash,
                transaction.blockIndex,
                transaction.timestamp);

              return self.updateBlockchainTransaction(r, transaction);
            } else {
              logger.info('[TransactionBO] The transaction was not found at database',
                transaction.transactionHash,
                transaction.blockIndex,
                transaction.timestamp);

              return self.createBlockchainTransaction(transaction);
            }
          })
          .then(function(r){
            return modelParser.clear(r);
          })
          .then(resolve)
          .catch(reject);
      });
    },

    updateIsConfirmedFlag: function(confirmedBlockIndex) {
      return Promise.all([
        transactionDAO.updateIsConfirmedFlag(confirmedBlockIndex),
        blockchainTransactionDAO.updateIsConfirmedFlag(confirmedBlockIndex)
      ]);
    },

    updateIsCreationNotifiedFlag: function(transactionId) {
      return transactionDAO.updateIsCreationNotifiedFlag(transactionId);
    },

    updateIsConfirmationNotifiedFlag: function(transactionId) {
      return transactionDAO.updateIsConfirmationNotifiedFlag(transactionId);
    }
  };
};
