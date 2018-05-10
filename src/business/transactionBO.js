var Promise         = require('promise');
var logger          = require('../config/logger');

module.exports = function(dependencies) {
  var transactionDAO = dependencies.transactionDAO;
  var transactionRequestDAO = dependencies.transactionRequestDAO;
  var blockchainTransactionDAO = dependencies.blockchainTransactionDAO;
  var modelParser = dependencies.modelParser;
  var daemonHelper = dependencies.daemonHelper;
  var addressBO = dependencies.addressBO;
  var configurationBO = dependencies.configurationBO;
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
          transactionHash: transactionHash
        };

        transactionRequestDAO.getAll(filter)
          .then(function(transactions) {
            if (transactions.length) {
              logger.info('[TransactionBO] Transaction request found by transactionHash',
                transactionHash,
                JSON.stringify(transactions[0]));
              return transactions[0];
            } else {
              logger.info('[TransactionBO] Transaction request not found by transactionHash',
                transactionHash);
              return null;
            }
          })
          .then(resolve)
          .catch(reject);
      });
    },

    save: function(entity) {
      var chain = Promise.resolve();

      return new Promise(function(resolve, reject) {
        var transactionRequest = entity;

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

    getBlockchainTransactionByTXID: function(txid, category) {
      return new Promise(function(resolve, reject) {
        var filter = {
          txid: txid,
          category: category
        };

        blockchainTransactionDAO.getAll(filter)
          .then(function(transactions) {
            if (transactions.length) {
              logger.info('[TransactionBO] Blockchain transaction found by txid/category', JSON.stringify(transactions[0]));
              return transactions[0];
            } else {
              logger.info('[TransactionBO] Blockchain transaction not found by txid/category', txid, category);
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
            transaction.blockhash = blockchainTransaction.blockhash;
            transaction.blocktime = blockchainTransaction.blocktime;
            transaction.updatedAt = dateHelper.getNow();
            console.log(transaction);
            return blockchainTransactionDAO.update(transaction);
          })
          .then(function(r) {
            rBlockchainTransaction = r;
            return transactionDAO.updateTransactionInfo(blockchainTransaction.txid,
              blockchainTransaction.blockhash,
              blockchainTransaction.blocktime);
          })
          .then(function() {
            return rBlockchainTransaction;
          })
          .then(resolve)
          .catch(reject);
      });
    },

    updateBalanceFromBlockchainTransaction: function(address, category, isConfirmed, existsTransactionRequest, amount) {
      return new Promise(function(resolve, reject) {
        var chain = Promise.resolve();
        return chain
          .then(function() {
            if (isConfirmed) {
              if (existsTransactionRequest) {
                if (category === 'send') {
                  return addressBO.withdraw(address, -amount, 1);
                } if (category === 'receive') {
                  return addressBO.withdraw(address, amount, 1)
                    .then(function() {
                      return addressBO.deposit(address, amount, 0);
                    });
                }
              } else {
                if (category === 'send') {
                  return addressBO.withdraw(address, -amount, 0);
                } if (category === 'receive') {
                  return addressBO.deposit(address, amount, 0);
                }
              }
            } else if (!isConfirmed && !existsTransactionRequest) {
              if (category === 'send') {
                return addressBO.withdraw(address, -amount, 1);
              } if (category === 'receive') {
                return addressBO.deposit(address, amount, 1);
              }
            }
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
        var address = null;
        var addressInfo = null;
        var rBlockchainTransaction = null;
        var minimumConfirmations = 0;

        chain
          .then(function() {
            return configurationBO.getByKey('minimumConfirmations');
          })
          .then(function(r) {
            minimumConfirmations = parseInt(r.value);
            logger.info('[TransactionBO] Trying to find the transaction request linked to this txid',
              blockchainTransaction.txid);
            return self.getTransactionRequestByTransactionHash(blockchainTransaction.txid);
          })
          .then(function(r) {
            transactionRequest = r;

            if (!r) {
              logger.info('[TransactionBO] There is no transaction request linked to this transactionHash',
                blockchainTransaction.txid);
            } else {
              logger.info('[TransactionBO] Transaction request linked to this transactionHash was found',
                blockchainTransaction.txid);
            }

            if (blockchainTransaction.to) {
              var addresses = blockchainTransaction.to.split('@');

              if (blockchainTransaction.category === 'send') {
                address = addresses[0]; // from
              } else if (blockchainTransaction.category === 'receive'){
                address = addresses[1]; //to
              }
            } else {
              address = blockchainTransaction.address;
            }

            var o = {
              address: blockchainTransaction.address,
              category: blockchainTransaction.category,
              amount: blockchainTransaction.amount,
              label: blockchainTransaction.label,
              blockhash: blockchainTransaction.blockhash,
              blocktime: blockchainTransaction.blocktime,
              txid: blockchainTransaction.txid,
              isConfirmed: blockchainTransaction.confirmations >= minimumConfirmations,
              time: blockchainTransaction.time,
              timereceived: blockchainTransaction.timereceived,
              createdAt: dateHelper.getNow(),
              to: blockchainTransaction.to
            };

            if (blockchainTransaction.fee) {
              o.fee = blockchainTransaction.fee;
            }

            logger.info('[TransactionBO] Saving the blockchain transaction', JSON.stringify(o));
            return blockchainTransactionDAO.save(o);
          })
          .then(function(r) {
            rBlockchainTransaction = r;

            logger.info('[TransactionBO] Trying to find the addresses at database', address);
            return addressBO.getByAddress(null, address);
          })
          .then(function(r) {
            if (r) {
              logger.info('[TransactionBO] The address was fount at database', JSON.stringify(r));
              addressInfo = r;
            } else {
              logger.info('[TransactionBO] There is no address at the database for the specified transaction');
            }

            return addressInfo;
          })
          .then(function() {
            if (addressInfo) {
              var newTransaction = {
                ownerId: addressInfo.ownerId,
                ownerTransactionId: transactionRequest ? transactionRequest.ownerTransactionId : null,
                amount: blockchainTransaction.amount + (blockchainTransaction.fee ? blockchainTransaction.fee : 0),
                isConfirmed: rBlockchainTransaction.isConfirmed,
                notifications: {
                  creation: {
                    isNotified: false
                  },
                  confirmation: {
                    isNotified: false
                  }
                },
                transactionHash: blockchainTransaction.txid,
                address: address,
                timestamp: blockchainTransaction.time,
                createdAt: dateHelper.getNow()
              };
              logger.info('[TransactionBO] Saving the transaction', JSON.stringify(newTransaction));
              return transactionDAO.save(newTransaction);
            } else {
              logger.warn('[TransactionBO] This transaction will be ignored. There is no address at database', JSON.stringify(blockchainTransaction));
            }
          })
          .then(function() {
            var amount = blockchainTransaction.amount + (blockchainTransaction.fee ? blockchainTransaction.fee : 0);

            console.log(address, rBlockchainTransaction.category, rBlockchainTransaction.isConfirmed, transactionRequest != null, amount);
            return self.updateBalanceFromBlockchainTransaction(address, rBlockchainTransaction.category, rBlockchainTransaction.isConfirmed, transactionRequest != null, amount);
          })
          .then(function() {
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
            logger.info('[TransactionBO] Trying to get the blockchain transaction from database ', transaction.txid, transaction.category);
            return self.getBlockchainTransactionByTXID(transaction.txid, transaction.category);
          })
          .then(function(r) {
            if (r) {
              logger.info('[TransactionBO] The transaction was found',
                JSON.stringify(r));

              return self.updateBlockchainTransaction(r, transaction);
            } else {
              logger.info('[TransactionBO] The transaction was not found at database',
                transaction.txid,
                transaction.category);

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

    updateIsConfirmedFlag: function(transactionHash, category) {
      var self = this;
      return new Promise(function(resolve, reject) {
        var chain = Promise.resolve();
        var blockchainTransaction = null;
        var transactionRequest = null;

        chain
          .then(function() {
            return self.getTransactionRequestByTransactionHash(transactionHash);
          })
          .then(function(r) {
            transactionRequest = r;
            return self.getBlockchainTransactionByTXID(transactionHash, category);
          })
          .then(function(r) {
            blockchainTransaction = modelParser.prepare(r);
            var address = null;
            var amount = blockchainTransaction.amount + (blockchainTransaction.fee ? blockchainTransaction.fee : 0);

            if (blockchainTransaction.to) {
              var addresses = blockchainTransaction.to.split('@');

              if (blockchainTransaction.category === 'send') {
                address = addresses[0]; // from
              } else if (blockchainTransaction.category === 'receive'){
                address = addresses[1]; //to
              }
            } else {
              address = blockchainTransaction.address;
            }

            return self.updateBalanceFromBlockchainTransaction(address, blockchainTransaction.category, true, transactionRequest != null, amount);
          })
          .then(function() {
            blockchainTransaction.isConfirmed = true;
            blockchainTransaction.updatedAt = dateHelper.getNow();

            return blockchainTransactionDAO.update(blockchainTransaction);
          })
          .then(function(r) {
            blockchainTransaction = modelParser.clear(r);
            return transactionDAO.updateIsConfirmedFlag(blockchainTransaction.txid);
          })
          .then(function() {
            return blockchainTransaction;
          })
          .then(resolve)
          .catch(reject);
      });
    },

    updateIsCreationNotifiedFlag: function(transactionId) {
      return transactionDAO.updateIsCreationNotifiedFlag(transactionId);
    },

    updateIsConfirmationNotifiedFlag: function(transactionId) {
      return transactionDAO.updateIsConfirmationNotifiedFlag(transactionId);
    }
  };
};
