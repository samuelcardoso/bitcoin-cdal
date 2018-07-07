var logger          = require('../config/logger');
var settings        = require('../config/settings');
var Decimal         = require('decimal.js');

module.exports = function(dependencies) {
  var addressDAO = dependencies.addressDAO;
  var modelParser = dependencies.modelParser;
  var daemonHelper = dependencies.daemonHelper;
  var dateHelper = dependencies.dateHelper;
  var mutexHelper = dependencies.mutexHelper;

  return {
    dependencies: dependencies,

    clear: function() {
      return new Promise(function(resolve, reject) {
        var chain = Promise.resolve();

        chain
          .then(function() {
            logger.debug('[AddressBO] Clearing the database');
            return addressDAO.clear();
          })
          .then(function() {
            logger.debug('[AddressBO] The database has been cleared');
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

        filter.isEnabled = true;

        logger.debug('[AddressBO.getAll()] Listing all addresses by filter ', filter);
        addressDAO.getAll(filter, {}, '+createdAt')
          .then(function(r) {
            logger.debug('[AddressBO.getAll()] Total of addresses', r.length);
            return r.map(function(item) {
              return modelParser.clear(item);
            });
          })
          .then(resolve)
          .catch(reject);
      });
    },

    getFreeAddresses: function() {
      var self = this;
      return new Promise(function(resolve, reject) {
        var chain = mutexHelper.lock('getFreeAddresses');
        var unlock = null;

        chain
          .then(function(r) {
            unlock = r;
            logger.debug('[AddressBO] Getting free addresses from database');
            return self.getAll({isEnabled: true, ownerId: null}, {}, '+createdAt');
          })
          .then(function(r) {
            unlock();
            return r;
          })
          .then(resolve)
          .catch(reject);
      });
    },

    createAddressFromDaemon: function(ownerId) {
      var self = this;
      var chain = Promise.resolve();

      return new Promise(function(resolve, reject) {
        chain
          .then(function() {
            logger.debug('[AddressBO] Requesting to the daemon a new address');
            return daemonHelper.createAddress();
          })
          .then(function(r) {
            logger.debug('[AddressBO] Saving the address and linking to ownerId', ownerId);
            return self.registerAddressFromDaemon(ownerId, r);
          })
          .then(resolve)
          .catch(reject);
      });
    },

    registerAddressFromDaemon: function(ownerId, address) {
      var chain = Promise.resolve();

      return new Promise(function(resolve, reject) {
        chain
          .then(function() {
            var addressEntity = {
              ownerId: ownerId,
              address: address,
              createdAt: dateHelper.getNow(),
              isEnabled: true,
              balance: {
                available: 0,
                locked: 0
              }
            };

            logger.debug('[AddressBO] Saving the address to the database', JSON.stringify(addressEntity));
            return addressDAO.save(addressEntity);
          })
          .then(function(r) {
            logger.debug('[AddressBO] The address was stored at database successfully', JSON.stringify(r));
            return modelParser.clear(r);
          })
          .then(resolve)
          .catch(reject);
      });
    },

    createAddress: function(ownerId) {
      var self = this;
      var chain = Promise.resolve();
      var freeAddress = null;

      return new Promise(function(resolve, reject) {
        return chain
          .then(function() {
            logger.debug('[AddressBO] Trying to get a free address from database');
            return self.getFreeAddresses();
          })
          .then(function(r) {
            var address = r.length > 0 ? r[0] : null;
            if (!address) {
              logger.debug('[AddressBO] There is no free address at database');
              return self.createAddressFromDaemon(ownerId);
            } else {
              logger.debug('[AddressBO] A free address was found at database', JSON.stringify(address));
              return address;
            }
          })
          .then(function(r) {
            freeAddress = modelParser.prepare(r);
            freeAddress.isEnabled = true;
            freeAddress.ownerId = ownerId;
            freeAddress.updatedAt = dateHelper.getNow();

            logger.debug('[AddressBO] Updating the free address to be owned by the ownerId ',
              JSON.stringify(freeAddress));
            return addressDAO.update(freeAddress);
          })
          .then(function(r) {
            logger.debug('[AddressBO] The address now is associated to the ownerId ', JSON.stringify(r));
            return modelParser.clear(r);
          })
          .then(resolve)
          .catch(reject);
      });
    },

    getByAddress: function(ownerId, address) {
      var self = this;

      return new Promise(function(resolve, reject) {
        var filter = {
          address: {$regex : new RegExp(address, 'i')}
        };

        if (ownerId) {
          filter.ownerId = ownerId;
        }

        logger.debug('[AddressBO] Getting an address by ownerId/address', ownerId, address);

        self.getAll(filter)
          .then(function(addresses) {
            if (addresses.length) {
              logger.debug('[AddressBO] Address found by ownerId/address', JSON.stringify(addresses[0]));
              return addresses[0];
            } else {
              logger.warn('[AddressBO] There is no address to provided informations', ownerId, address);
              return null;
            }
          })
          .then(resolve)
          .catch(reject);
      });
    },

    delete: function(ownerId, address) {
      var self = this;

      return new Promise(function(resolve, reject) {
        logger.debug('[AddressBO] Disabling an address', ownerId, address);

        self.getByAddress(ownerId, address)
          .then(function(addresses) {
            if (!addresses) {
              logger.warn('[AddressBO] A error will be thrown. There is no address to the provided informations',
                ownerId, address);
              throw {
                status: 404,
                message: 'The address ' + address + ' not found'
              };
            } else {
              return addressDAO.disable(addresses.id);
            }
          })
          .then(resolve)
          .catch(reject);
      });
    },

    insertFunds: function(address, amount, balanceType) {
      var self = this;

      if (settings.daemonSettings.useMainAddressBalance && settings.daemonSettings.mainAddress) {
        address = settings.daemonSettings.mainAddress;
      }

      return new Promise(function(resolve, reject) {
        var chain = mutexHelper.lock(address);
        var unlock = null;

        return chain
          .then(function(r) {
            unlock = r;
            return self.getByAddress(null, address);
          })
          .then(function(r) {
            if (balanceType === 1) {
              logger.debug('[AddressBO.insertFunds()] Depositing funds in the locked balance (address, amount)', address, amount);
              r.balance.locked = new Decimal(r.balance.locked).plus(amount).toFixed(8);
            } else {
              logger.debug('[AddressBO.insertFunds()] Depositing funds in the available balance (address, amount)', address, amount);
              r.balance.available = new Decimal(r.balance.available).plus(amount).toFixed(8);
            }

            newAddress = modelParser.prepare(r);
            newAddress.isEnabled = true;
            newAddress.updatedAt = dateHelper.getNow();

            logger.debug('[AddressBO.insertFunds()] New address balance', JSON.stringify(newAddress));
            return addressDAO.update(newAddress);
          })
          .then(function(r) {
            unlock();
            return r;
          })
          .then(resolve)
          .catch(reject);
      });
    },

    checkHasFunds: function(address, amount, balanceType) {
      var self = this;

      if (settings.daemonSettings.useMainAddressBalance && settings.daemonSettings.mainAddress) {
        address = settings.daemonSettings.mainAddress;
      }

      return new Promise(function(resolve, reject) {
        var chain = mutexHelper.lock(address);
        var unlock = null;

        return chain
          .then(function(r) {
            unlock = r;
            return self.getByAddress(null, address);
          })
          .then(function(r) {
            logger.debug('[AddressBO.checkHasFunds()] Checking if the wallet has funds', JSON.stringify(r));
            var referenceBalance = balanceType === 1 ?
                                                   r.balance.locked :
                                                   r.balance.available;
            if (referenceBalance < amount) {
              logger.debug('[AddressBO.checkHasFunds()] The wallet has funds', JSON.stringify(r));
              return false;
            } else {
              logger.debug('[AddressBO.checkHasFunds()] The wallet do not have funds', JSON.stringify(r));
              return true;
            }
          })
          .then(function(r) {
            unlock();
            return r;
          })
          .then(resolve)
          .catch(reject);
      });
    },

    withdraw: function(address, amount, balanceType) {
      var self = this;

      if (settings.daemonSettings.useMainAddressBalance && settings.daemonSettings.mainAddress) {
        address = settings.daemonSettings.mainAddress;
      }

      return new Promise(function(resolve, reject) {
        var chain = mutexHelper.lock(address);
        var unlock = null;

        return chain
          .then(function(r) {
            unlock = r;
            return self.getByAddress(null, address);
          })
          .then(function(r) {
            logger.debug('[AddressBO.withdraw()] Checking if the wallet has funds', JSON.stringify(r));
            var referenceBalance = balanceType === 1 ?
                                                   r.balance.locked :
                                                   r.balance.available;
            if (referenceBalance < amount) {
              throw {
                status: 409,
                error: 'INVALID_WALLET_BALANCE',
                message: 'Source wallet does not have funds to withdraw (+' + referenceBalance + ', -' + amount + ')'
              };
            } else {
              if (balanceType === 1) {
                logger.debug('[AddressBO.withdraw()] Withdrawing funds in the locked balance (address, amount)', address, -amount);
                r.balance.locked = new Decimal(r.balance.locked).minus(amount).toFixed(8);
              } else {
                logger.debug('[AddressBO.withdraw()] Withdrawing funds in the available balance (address, amount)', address, -amount);
                r.balance.available = new Decimal(r.balance.available).minus(amount).toFixed(8);
              }

              newAddress = modelParser.prepare(r);
              newAddress.isEnabled = true;
              newAddress.updatedAt = dateHelper.getNow();

              logger.debug('[AddressBO] New address balance', JSON.stringify(newAddress));
              return addressDAO.update(newAddress);
            }
          })
          .then(function(r) {
            unlock();
            return modelParser.clear(r);
          })
          .then(resolve)
          .catch(reject);
      });
    },

    deposit: function(address, amount, balanceType) {
      var self = this;

      if (settings.daemonSettings.useMainAddressBalance && settings.daemonSettings.mainAddress) {
        address = settings.daemonSettings.mainAddress;
      }

      return new Promise(function(resolve, reject) {
        var chain = mutexHelper.lock(address);
        var unlock = null;

        return chain
          .then(function(r) {
            unlock = r;
            return self.getByAddress(null, address);
          })
          .then(function(r) {
            if (balanceType === 1) {
              logger.debug('[AddressBO] Depositing funds in the locked balance (address, amount)', address, amount);
              r.balance.locked = new Decimal(r.balance.locked).plus(amount).toFixed(8);
            } else {
              logger.debug('[AddressBO] Depositing funds in the available balance (address, amount)', address, amount);
              r.balance.available = new Decimal(r.balance.available).plus(amount).toFixed(8);
            }

            newAddress = modelParser.prepare(r);
            newAddress.isEnabled = true;
            newAddress.updatedAt = dateHelper.getNow();

            logger.debug('[AddressBO] New address balance', JSON.stringify(newAddress));
            return addressDAO.update(newAddress);
          })
          .then(function(r) {
            unlock();
            return modelParser.clear(r);
          })
          .then(resolve)
          .catch(reject);
      });
    },

    getAddressBalance: function(address) {
      var self = this;

      return new Promise(function(resolve, reject) {
        self.getByAddress(null, address)
          .then(function(r) {
            return r.balance;
          })
          .then(resolve)
          .catch(reject);
      });
    },
  };
};
