var logger              = require('winston');
var model               = require('../models/transactionRequest')();
var Promise             = require('promise');

module.exports = function() {
  var projectionCommonFields = {
    __v: false
  };

  return {
    clear: function() {
      return new Promise(function(resolve, reject) {
        model.remove({}, function(err) {
          if (err) {
            logger.error('[TransactionRequestDAO] An error has occurred while deleting all transaction requests', error);
            reject(err);
          } else {
            logger.info('[TransactionRequestDAO] The transaction requests have been deleted succesfully');
            resolve();
          }
        });
      });
    },

    getAll: function(filter) {
      return new Promise(function(resolve, reject) {
        logger.info('[TransactionRequestDAO] Getting transaction requests from database', filter);

        model.find(filter, projectionCommonFields)
          .lean()
          .exec()
          .then(function(items) {
            logger.info('[TransactionRequestDAO] %d transaction requests were returned', items.length);
            resolve(items);
          }).catch(function(erro) {
            logger.error('[TransactionRequestDAO] An error has ocurred while getting transaction requests from database', erro);
            reject(erro);
          });
      });
    },

    getById: function(id) {
      var self = this;
      return new Promise(function(resolve, reject) {
        logger.info('[TransactionRequestDAO] Getting a transaction request by id %s', id);

        self.getAll({_id: id})
        .then(function(items) {
          if (items.length === 0) {
            resolve(null);
            logger.info('[TransactionRequestDAO] The transaction request not found');
          } else {
            resolve(items[0]);
            logger.info('[TransactionRequestDAO] The transaction request was found');
          }
        }).catch(function(erro) {
            logger.error('[TransactionRequestDAO] An error has occurred while getting a transaction request by id %s', id, erro);
            reject(erro);
        });
      });
    },

    save: function(entity) {
      var self = this;
      return new Promise(function(resolve, reject) {
        logger.info('[TransactionRequestDAO] Creating a new transaction request', JSON.stringify(entity));
        model.create(entity)
        .then(function(item) {
          logger.info('[TransactionRequestDAO] The transaction request has been created succesfully', JSON.stringify(item));
          return self.getById(item._id);
        })
        .then(resolve)
        .catch(function(error) {
          logger.error('[TransactionRequestDAO] An error has ocurred while saving a new transaction request', error);
          reject({
            status: 422,
            message: error.message
          });
        });
      });
    },

    update: function(entity) {
      return new Promise(function(resolve, reject) {
        logger.info('[TransactionRequestDAO] Update a transaction request', JSON.stringify(entity));

        model.findByIdAndUpdate(entity._id, entity, {'new': true, fields: projectionCommonFields})
        .then(function(item) {
          logger.info('[TransactionRequestDAO] The transaction request has been updated succesfully');
          logger.debug(JSON.stringify(item.toObject()));
          resolve(item.toObject());
        }).catch(function(error) {
          logger.error('[TransactionRequestDAO] An error has ocurred while updating a transaction request', error);
          reject({
            status: 422,
            message: error
          });
        });
      });
    },

    disable: function(id) {
      return new Promise(function(resolve, reject) {
        logger.info('[TransactionRequestDAO] Disabling a transaction request');

        model.findByIdAndUpdate(id, {_id:id, isEnabled: false}, {'new': true, fields: projectionCommonFields})
        .then(function(item) {
          logger.info('[TransactionRequestDAO] The transaction request has been disabled succesfully');
          resolve(item.toObject());
        }).catch(function(error) {
          logger.error('[TransactionRequestDAO] An error has ocurred while disabling a transaction request', error);
          reject({
            status: 422,
            message: error
          });
        });
      });
    },
  };
};
