var Promise         = require('promise');
var logger          = require('../config/logger');
var Decimal         = require('decimal.js');

module.exports = function(dependencies) {
  var transactionDAO = dependencies.transactionDAO;
  var transactionRequestDAO = dependencies.transactionRequestDAO;
  var blockchainTransactionDAO = dependencies.blockchainTransactionDAO;
  var modelParser = dependencies.modelParser;
  var daemonHelper = dependencies.daemonHelper;
  var addressBO = dependencies.addressBO;
  var configurationBO = dependencies.configurationBO;
  var dateHelper = dependencies.dateHelper;
  var mutexHelper = dependencies.mutexHelper;

  return {
    dependencies: dependencies,

    clear: function() {
      return new Promise(function(resolve, reject) {
        var chain = Promise.resolve();

        chain
          .then(function() {
            var p = [];
            p.push(transactionDAO.clear());
            p.push(transactionRequestDAO.clear());
            p.push(blockchainTransactionDAO.clear());
            logger.info('[TransactionBO] Clearing the database');
            return Promise.all(p);
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

      return new Promise(function(resolve, reject) {
        var chain = mutexHelper.lock('transaction/' + entity.from);
        var unlock = null;
        var transactionRequest = entity;

        return chain
          .then(function(r) {
            unlock = r;
            logger.info('[TransactionBO.save()] Estimating the fee');
            return daemonHelper.estimateSmartFee();
          })
          .then(function(r) {
            logger.info('[TransactionBO.save()] Estimated fee', r);
            logger.debug('[TransactionBO.save()] Calculating amout to check (r * 1.1) + entity.amount', r, entity.amount, JSON.stringify(entity));
            var amountToCheck = new Decimal(r).times(1.1).plus(entity.amount).toFixed(8);
            return addressBO.checkHasFunds(entity.from, amountToCheck, 0);
          })
          .then(function(r) {
            if (!r) {
              throw {
                status: 409,
                error: 'INVALID_WALLET_BALANCE',
                message: 'The wallet does not have funds to withdraw ' + entity.amount + ''
              };
            }

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
          .then(function() {
            var amountToWithdraw = new Decimal(transactionRequest.amount).plus(transactionRequest.fee).toFixed(8);
            logger.info('[TransactionBO] Withdrawing the amount + fee from the wallet', transactionRequest.from, amountToWithdraw);
            return addressBO.withdraw(transactionRequest.from, amountToWithdraw, 0)
              .then(function() {
                return addressBO.deposit(transactionRequest.from, amountToWithdraw, 1);
              });
          })
          .then(function() {
            return addressBO.getByAddress(null, transactionRequest.to);
          })
          .then(function(r) {
            if (r) {
              var amountToDeposit = new Decimal(transactionRequest.amount).toFixed(8);
              logger.info('[TransactionBO] Despositing the amount to wallet', r.address, amountToDeposit);
              return addressBO.deposit(r.address, amountToDeposit, 1);
            }
          })
          .then(function(){
            unlock();
            return modelParser.clear(transactionRequest);
          })
          .then(resolve)
          .catch(function(e) {
            unlock();
            logger.error('[TransactionBO] An error has occurred whilte save transactions', JSON.stringify(e));
            reject(e);
          });
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

    getBlockchainTransactionsByTXID: function(txid) {
      return new Promise(function(resolve, reject) {
        var filter = {
          txid: txid
        };

        blockchainTransactionDAO.getAll(filter)
          .then(resolve)
          .catch(reject);
      });
    },

    getBlockchainTransactions: function() {
      return new Promise(function(resolve, reject) {
        var filter = {};

        blockchainTransactionDAO.getAll(filter)
          .then(resolve)
          .catch(reject);
      });
    },

    updateBlockchainTransaction: function(transaction, blockchainTransaction) {
      var self = this;

      return new Promise(function(resolve, reject) {
        var chain = Promise.resolve();
        var rBlockchainTransaction = null;
        var minimumConfirmations = 0;
        var originIsConfirmed = false;

        chain
          .then(function() {
            return configurationBO.getByKey('minimumConfirmations');
          })
          .then(function(r) {
            minimumConfirmations = parseInt(r.value);

            transaction.blockhash = blockchainTransaction.blockhash;
            transaction.blocktime = blockchainTransaction.blocktime;
            transaction.updatedAt = dateHelper.getNow();
            originIsConfirmed = transaction.isConfirmed;
            transaction.isConfirmed = blockchainTransaction.confirmations >= minimumConfirmations;

            return blockchainTransactionDAO.update(transaction);
          })
          .then(function(r) {
            rBlockchainTransaction = r;
            return transactionDAO.updateTransactionInfo(blockchainTransaction.txid,
              blockchainTransaction.blockhash,
              blockchainTransaction.blocktime);
          })
          .then(function() {
            if (!originIsConfirmed && transaction.isConfirmed) {
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

              if (blockchainTransaction.category === 'send') {
                amount = new Decimal(amount).times(-1);
              }

              return self.updateBalanceFromBlockchainTransaction(address, blockchainTransaction.category, true, true, amount)
                .then(function() {
                  return transactionDAO.updateIsConfirmedFlag(blockchainTransaction.txid);
                });
            }
          })
          .then(function() {
            return rBlockchainTransaction;
          })
          .then(resolve)
          .catch(reject);
      });
    },

    updateBalanceFromBlockchainTransaction: function(address, category, isConfirmed, existsTransactions, amount) {
      return new Promise(function(resolve, reject) {
        var chain = Promise.resolve();
        return chain
          .then(function() {
            if (isConfirmed) {
              if (existsTransactions) {
                if (category === 'send') {
                  return addressBO.withdraw(address, amount, 1);
                } if (category === 'receive') {
                  return addressBO.withdraw(address, amount, 1)
                    .then(function() {
                      return addressBO.deposit(address, amount, 0);
                    });
                }
              } else {
                if (category === 'send') {
                  return addressBO.withdraw(address, amount, 0);
                } if (category === 'receive') {
                  return addressBO.deposit(address, amount, 0);
                }
              }
            } else if (!isConfirmed && !existsTransactions) {
              if (category === 'send') {
                return addressBO.withdraw(address, amount, 0)
                  .then(function() {
                    return addressBO.deposit(address, amount, 1);
                  });
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
        var amount = 0;

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
            if (!addressInfo) {
              logger.info('[TransactionBO] Registering the address from daemon', address);
              return addressBO.registerAddressFromDaemon(null, address);
            }
          })
          .then(function() {
            var d = new Decimal(blockchainTransaction.amount);
            amount = d.plus(blockchainTransaction.fee ? blockchainTransaction.fee : 0);

            var newTransaction = {
              ownerId: addressInfo ? addressInfo.ownerId : null,
              ownerTransactionId: transactionRequest ? transactionRequest.ownerTransactionId : null,
              amount: amount.toFixed(8),
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
          })
          .then(function() {
            if (blockchainTransaction.category === 'send') {
              amount = new Decimal(amount).times(-1);
            }

            logger.info('[TransactionBO] Updating the balance from blockchain transaction', address, amount.toFixed(8));
            return self.updateBalanceFromBlockchainTransaction(address, rBlockchainTransaction.category, rBlockchainTransaction.isConfirmed, transactionRequest != null, amount.toFixed(8));
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
            if (r && !r.isConfirmed) {
              logger.info('[TransactionBO] The transaction was found',
                JSON.stringify(r));

              return self.updateBlockchainTransaction(r, transaction);
            } else if (!r) {
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

    updateIsCreationNotifiedFlag: function(transactionId) {
      return transactionDAO.updateIsCreationNotifiedFlag(transactionId);
    },

    updateIsConfirmationNotifiedFlag: function(transactionId) {
      return transactionDAO.updateIsConfirmationNotifiedFlag(transactionId);
    }
  };
};
