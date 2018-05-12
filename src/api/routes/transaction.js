module.exports = function(app) {
  var controller = app.controllers.transaction;

  app.route('/v1/transactions')
    .get(controller.getAll);

  app.route('/v1/transactions/:transactionHash')
    .get(controller.getAll);

  app.route('/v1/blockchain-transactions/:transactionHash')
    .get(controller.getBlockchainTransaction);

  app.route('/v1/:ownerId/transactions')
    .get(controller.getAll)
    .post(controller.save);
  app.route('/v1/:ownerId/transactions/:transactionHash')
    .get(controller.getAll);
  app.route('/v1/:ownerId/transactions/:transactionHash/blockchain-transaction')
    .get(controller.getBlockchainTransactionByTransaction);

  app.route('/v1/addresses/:address/transactions')
    .get(controller.getAll);
  app.route('/v1/addresses/:address/transactions/:transactionHash')
    .get(controller.getAll);

  app.route('/v1/:ownerId/addresses/:address/transactions')
    .get(controller.getAll)
    .post(controller.save);

  app.route('/v1/:ownerId/addresses/:address/transactions/:transactionHash')
    .get(controller.getAll);

  app.route('/v1/:ownerId/addresses/:address/transactions/:transactionHash/blockchain-transaction')
    .get(controller.getBlockchainTransactionByTransaction);

  app.route('/v1/transactions/:transactionHash/blockchain-transaction')
    .get(controller.getBlockchainTransactionByTransaction);
};
