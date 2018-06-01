module.exports = function(app) {
  var controller = app.controllers.address;

  app.route('/v1/addresses')
    .get(controller.getAll);

  app.route('/v1/:ownerId/addresses')
    .post(controller.createAddress)
    .get(controller.getAllByOwnerId);

  app.route('/v1/addresses/:address')
    .get(controller.getByAddress);

  app.route('/v1/addresses/:address/balance')
    .get(controller.getAddressBalance);

  app.route('/v1/:ownerId/addresses/:address')
    .get(controller.getByAddress)
    .put(controller.update);

  app.route('/v1/:ownerId/addresses/:address/balance')
    .get(controller.getAddressBalance);
};
