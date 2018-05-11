var TransactionBO               = require('./transactionBO');
var AddressBO                   = require('./addressBO');
var ConfigurationBO             = require('./configurationBO');
var DAOFactory                  = require('../daos/daoFactory');
var ModelParser                 = require('../models/modelParser');
var HelperFactory               = require('../helpers/helperFactory');

function factory(dao) {
  switch (dao) {
    case 'configuration':
      return new ConfigurationBO({
        configurationDAO: DAOFactory.getDAO('configuration'),
        modelParser: new ModelParser(),
        dateHelper: HelperFactory.getHelper('date')
      });
    case 'transaction':
      return new TransactionBO({
        addressBO: factory('address'),
        configurationBO: factory('configuration'),
        addressDAO: DAOFactory.getDAO('address'),
        transactionDAO: DAOFactory.getDAO('transaction'),
        transactionRequestDAO: DAOFactory.getDAO('transactionRequest'),
        blockchainTransactionDAO: DAOFactory.getDAO('blockchainTransaction'),
        modelParser: new ModelParser(),
        daemonHelper: HelperFactory.getHelper('daemon'),
        dateHelper: HelperFactory.getHelper('date'),
        mutexHelper: HelperFactory.getHelper('mutex')
      });
    case 'address':
      return new AddressBO({
        addressDAO: DAOFactory.getDAO('address'),
        modelParser: new ModelParser(),
        dateHelper: HelperFactory.getHelper('date'),
        daemonHelper: HelperFactory.getHelper('daemon'),
        configurationBO: factory('configuration'),
        mutexHelper: HelperFactory.getHelper('mutex')
      });
    default:
      return null;
  }
};

module.exports = {getBO: factory};
