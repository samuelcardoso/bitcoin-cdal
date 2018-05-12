var AddressBO         = require('../../../src/business/addressBO');
var ModelParser       = require('../../../src/models/modelParser');
var DaemonHelper      = require('../../../src/helpers/daemonHelper');
var DateHelper        = require('../../../src/helpers/dateHelper');
var HelperFactory     = require('../../../src/helpers/helperFactory');
var DAOFactory        = require('../../../src/daos/daoFactory');
var Decimal           = require('decimal.js');
var chai              = require('chai');
var sinon             = require('sinon');
var expect            = chai.expect;

describe('Business > AddressBO > ', function() {
  var addressDAO = DAOFactory.getDAO('address');
  var dateHelper = new DateHelper();
  var modelParser = new ModelParser();
  var daemonHelper = new DaemonHelper({});
  var mutexHelper = HelperFactory.getHelper('mutex');

  var addressBO = new AddressBO({
    addressDAO: addressDAO,
    modelParser: modelParser,
    dateHelper: dateHelper,
    daemonHelper: daemonHelper,
    mutexHelper: mutexHelper
  });

  describe('Methods > ', function() {
    it('clear', function() {
      var clearStub = sinon.stub(addressDAO, 'clear');
      clearStub
        .withArgs()
        .returns(Promise.resolve());

      return addressBO.clear()
        .then(function(){
          expect(clearStub.callCount).to.be.equal(1);
          clearStub.restore();
        });
    });

    it('getAll', function() {
      var getAllStub = sinon.stub(addressDAO, 'getAll');
      getAllStub
        .withArgs({isEnabled: true})
        .returns(Promise.resolve([]));

      return addressBO.getAll()
        .then(function(){
          expect(getAllStub.callCount).to.be.equal(1);

          getAllStub.restore();
        });
    });

    it('getFreeAddresses', function() {
      var getAllStub = sinon.stub(addressDAO, 'getAll');
      getAllStub
        .withArgs({
          ownerId: null,
          isEnabled: true
        })
        .returns(Promise.resolve([]));

      return addressBO.getFreeAddresses()
        .then(function(){
          expect(getAllStub.callCount).to.be.equal(1);

          getAllStub.restore();
        });
    });

    it('registerAddressFromDaemon', function() {
      var now = new Date();
      var getNowStub = sinon.stub(dateHelper, 'getNow');
      getNowStub
        .withArgs()
        .returns(now);

      var saveStub = sinon.stub(addressDAO, 'save');
      saveStub
        .withArgs({
          ownerId: null,
          address: 'address',
          createdAt: now,
          isEnabled: true,
          balance: {
            available: 0,
            locked: 0
          }
        })
        .returns({
          _id: 'ID',
          ownerId: null,
          address: 'address',
          createdAt: now,
          isEnabled: true,
          balance: {
            available: 0,
            locked: 0
          }
        });

      return addressBO.registerAddressFromDaemon(null, 'address')
        .then(function(r){
          console.log(r);
          expect(r).to.be.deep.equal({
            id: 'ID',
            ownerId: null,
            address: 'address',
            createdAt: now,
            isEnabled: true,
            balance: {
              available: 0,
              locked: 0
            }
          });

          getNowStub.restore();
          saveStub.restore();
        });
    });

    it('deposit in locked balance', function() {
      var now = new Date();
      var getNowStub = sinon.stub(dateHelper, 'getNow');
      getNowStub
        .withArgs()
        .returns(now);

      lockStub = sinon.stub(mutexHelper, 'lock');
      lockStub.withArgs('address').returns(Promise.resolve(function(){}));

      var getAllStub = sinon.stub(addressDAO, 'getAll');
      getAllStub
        .withArgs({address: 'address', isEnabled: true})
        .returns(Promise.resolve([{
          ownerId: null,
          address: 'address',
          balance: {
            available: 10,
            locked: 1
          },
          id: 'ID',
          isEnabled: true,
          createdAt: now,
          updatedAt: now
        }]));

      var updateStub = sinon.stub(addressDAO, 'update');
      updateStub
        .withArgs()
        .returns({
          ownerId: null,
          address: 'address',
          balance: {
            available: 10,
            locked: 11
          },
          _id: 'ID',
          isEnabled: true,
          createdAt: now,
          updatedAt: now
        });

      return addressBO.deposit('address', 10, 1)
        .then(function(r){
          expect(r).to.be.deep.equal({
            id: 'ID',
            ownerId: null,
            address: 'address',
            createdAt: now,
            updatedAt: now,
            isEnabled: true,
            balance: {
              available: 10,
              locked: 11
            }
          });

          lockStub.restore();
          getNowStub.restore();
          getAllStub.restore();
          updateStub.restore();
        });
    });

    it('should withdraw in locked balance', function() {
      var now = new Date();
      var getNowStub = sinon.stub(dateHelper, 'getNow');
      getNowStub
        .withArgs()
        .returns(now);

      lockStub = sinon.stub(mutexHelper, 'lock');
      lockStub.withArgs('address').returns(Promise.resolve(function(){}));

      var getAllStub = sinon.stub(addressDAO, 'getAll');
      getAllStub
        .withArgs({address: 'address', isEnabled: true})
        .returns(Promise.resolve([{
          ownerId: null,
          address: 'address',
          balance: {
            available: 10,
            locked: 1
          },
          id: 'ID',
          isEnabled: true,
          createdAt: now,
          updatedAt: now
        }]));

      var updateStub = sinon.stub(addressDAO, 'update');
      updateStub
        .withArgs()
        .returns({
          ownerId: null,
          address: 'address',
          balance: {
            available: 10,
            locked: 0.5
          },
          _id: 'ID',
          isEnabled: true,
          createdAt: now,
          updatedAt: now
        });

      return addressBO.withdraw('address', new Decimal(0.5).toFixed(8), 1)
        .then(function(r){
          expect(r).to.be.deep.equal({
            id: 'ID',
            ownerId: null,
            address: 'address',
            createdAt: now,
            updatedAt: now,
            isEnabled: true,
            balance: {
              available: 10,
              locked: 0.5
            }
          });

          lockStub.restore();
          getNowStub.restore();
          getAllStub.restore();
          updateStub.restore();
        });
    });

    it('deposit in available balance', function() {
      var now = new Date();
      var getNowStub = sinon.stub(dateHelper, 'getNow');
      getNowStub
        .withArgs()
        .returns(now);

      lockStub = sinon.stub(mutexHelper, 'lock');
      lockStub.withArgs('address').returns(Promise.resolve(function(){}));

      var getAllStub = sinon.stub(addressDAO, 'getAll');
      getAllStub
        .withArgs({address: 'address', isEnabled: true})
        .returns(Promise.resolve([{
          ownerId: null,
          address: 'address',
          balance: {
            available: 10,
            locked: 1
          },
          id: 'ID',
          isEnabled: true,
          createdAt: now,
          updatedAt: now
        }]));

      var updateStub = sinon.stub(addressDAO, 'update');
      updateStub
        .withArgs()
        .returns({
          ownerId: null,
          address: 'address',
          balance: {
            available: 20,
            locked: 1
          },
          _id: 'ID',
          isEnabled: true,
          createdAt: now,
          updatedAt: now
        });

      return addressBO.deposit('address', 10, 0)
        .then(function(r){
          expect(r).to.be.deep.equal({
            id: 'ID',
            ownerId: null,
            address: 'address',
            createdAt: now,
            updatedAt: now,
            isEnabled: true,
            balance: {
              available: 20,
              locked: 1
            }
          });

          lockStub.restore();
          getNowStub.restore();
          getAllStub.restore();
          updateStub.restore();
        });
    });

    it('should withdraw in available balance', function() {
      var now = new Date();
      var getNowStub = sinon.stub(dateHelper, 'getNow');
      getNowStub
        .withArgs()
        .returns(now);

      lockStub = sinon.stub(mutexHelper, 'lock');
      lockStub.withArgs('address').returns(Promise.resolve(function(){}));

      var getAllStub = sinon.stub(addressDAO, 'getAll');
      getAllStub
        .withArgs({address: 'address', isEnabled: true})
        .returns(Promise.resolve([{
          ownerId: null,
          address: 'address',
          balance: {
            available: 10,
            locked: 1
          },
          id: 'ID',
          isEnabled: true,
          createdAt: now,
          updatedAt: now
        }]));

      var updateStub = sinon.stub(addressDAO, 'update');
      updateStub
        .withArgs()
        .returns({
          ownerId: null,
          address: 'address',
          balance: {
            available: 9.5,
            locked: 1
          },
          _id: 'ID',
          isEnabled: true,
          createdAt: now,
          updatedAt: now
        });

      return addressBO.withdraw('address', new Decimal(0.5).toFixed(8), 0)
        .then(function(r){
          expect(r).to.be.deep.equal({
            id: 'ID',
            ownerId: null,
            address: 'address',
            createdAt: now,
            updatedAt: now,
            isEnabled: true,
            balance: {
              available: 9.5,
              locked: 1
            }
          });

          lockStub.restore();
          getNowStub.restore();
          getAllStub.restore();
          updateStub.restore();
        });
    });



    it('should failt to withdraw in available balance whitout funds', function() {
      var now = new Date();
      var getNowStub = sinon.stub(dateHelper, 'getNow');
      getNowStub
        .withArgs()
        .returns(now);

      lockStub = sinon.stub(mutexHelper, 'lock');
      lockStub.withArgs('address').returns(Promise.resolve(function(){}));

      var getAllStub = sinon.stub(addressDAO, 'getAll');
      getAllStub
        .withArgs({address: 'address', isEnabled: true})
        .returns(Promise.resolve([{
          ownerId: null,
          address: 'address',
          balance: {
            available: 10,
            locked: 1
          },
          id: 'ID',
          isEnabled: true,
          createdAt: now,
          updatedAt: now
        }]));

      return addressBO.withdraw('address', new Decimal(11).toFixed(8), 0)
        .catch(function(r){
          expect(r.error).to.be.equal('INVALID_WALLET_BALANCE');

          lockStub.restore();
          getNowStub.restore();
          getAllStub.restore();
        });
    });

    it('createAddressFromDaemon', function() {
      var createAddressStub = sinon.stub(daemonHelper, 'createAddress');
      createAddressStub
        .withArgs()
        .returns(Promise.resolve('address'));

      var now = new Date();
      var getNowStub = sinon.stub(dateHelper, 'getNow');
      getNowStub
        .withArgs()
        .returns(now);

      var saveStub = sinon.stub(addressDAO, 'save');
      saveStub
        .withArgs({
          ownerId: null,
          address: 'address',
          createdAt: now,
          isEnabled: true,
          balance: {
            available: 0,
            locked: 0
          }
        })
        .returns({
          _id: 'ID',
          ownerId: null,
          address: 'address',
          createdAt: now,
          isEnabled: true,
          balance: {
            available: 0,
            locked: 0
          }
        });

      return addressBO.createAddressFromDaemon(null)
        .then(function(r){
          expect(r).to.be.deep.equal({
            id: 'ID',
            ownerId: null,
            address: 'address',
            createdAt: now,
            isEnabled: true,
            balance: {
              available: 0,
              locked: 0
            }
          });

          createAddressStub.restore();
          getNowStub.restore();
          saveStub.restore();
        });
    });

    it('createAddress with no free address at database', function() {
      var getAll = sinon.stub(addressDAO, 'getAll');
      getAll
        .withArgs({
          isEnabled: true,
          ownerId: null
        }, {}, '+createdAt')
        .returns(Promise.resolve([]));

      var createAddressStub = sinon.stub(daemonHelper, 'createAddress');
      createAddressStub
        .withArgs()
        .returns(Promise.resolve('address'));

      var now = new Date();
      var getNowStub = sinon.stub(dateHelper, 'getNow');
      getNowStub
        .withArgs()
        .returns(now);

      var saveStub = sinon.stub(addressDAO, 'save');
      saveStub
        .withArgs({
          ownerId: 'ownerId',
          address: 'address',
          createdAt: now,
          isEnabled: true,
          balance: {
            available: 0,
            locked: 0
          }
        })
        .returns({
          _id: 'ID',
          ownerId: 'ownerId',
          address: 'address',
          createdAt: now,
          updatedAt: now,
          isEnabled: true,
          balance: {
            available: 0,
            locked: 0
          }
        });

        var updateStub = sinon.stub(addressDAO, 'update');
        updateStub
          .withArgs({
            ownerId: 'ownerId',
            address: 'address',
            createdAt: now,
            updatedAt: now,
            isEnabled: true,
            balance: {
              available: 0,
              locked: 0
            },
            _id: 'ID',
          })
          .returns({
            _id: 'ID',
            ownerId: 'ownerId',
            address: 'address',
            createdAt: now,
            updatedAt: now,
            isEnabled: true,
            balance: {
              available: 0,
              locked: 0
            }
          });

      return addressBO.createAddress('ownerId')
        .then(function(r){
          expect(r).to.be.deep.equal({
            id: 'ID',
            ownerId: 'ownerId',
            address: 'address',
            createdAt: now,
            updatedAt: now,
            isEnabled: true,
            balance: {
              available: 0,
              locked: 0
            }
          });
          expect(createAddressStub.callCount).to.be.equal(1);
          expect(getNowStub.callCount).to.be.equal(2);
          expect(saveStub.callCount).to.be.equal(1);
          expect(updateStub.callCount).to.be.equal(1);

          getAll.restore();
          createAddressStub.restore();
          getNowStub.restore();
          saveStub.restore();
          updateStub.restore();
        });
    });

    it('disable', function() {
      var getAllStub = sinon.stub(addressDAO, 'getAll');
      getAllStub
        .withArgs({address: 'address', isEnabled: true})
        .returns(Promise.resolve([{
          address: 'address',
          id: 'ID'
        }]));

      var disableStub = sinon.stub(addressDAO, 'disable');
      disableStub
        .withArgs('ID')
        .returns(Promise.resolve({
          _id: 'ID',
          address: 'address'
        }));

      return addressBO.delete(null, 'address')
        .then(function(){
          expect(getAllStub.callCount).to.be.equal(1);
          expect(disableStub.callCount).to.be.equal(1);

          getAllStub.restore();
          disableStub.restore();
        });
    });

    it('disable method should fail with an invalid address', function() {
      var deleteAddressStub = sinon.stub(daemonHelper, 'deleteAddress');
      var disableStub = sinon.stub(addressDAO, 'disable');

      var getAllStub = sinon.stub(addressDAO, 'getAll');
      getAllStub
        .withArgs({address: 'address', isEnabled: true})
        .returns(Promise.resolve([]));


      return addressBO.delete(null, 'address')
        .catch(function(r){
          expect(getAllStub.callCount).to.be.equal(1);
          expect(deleteAddressStub.callCount).to.be.equal(0);
          expect(disableStub.callCount).to.be.equal(0);
          expect(r.status).to.be.equal(404);
          expect(r.message).to.be.equal('The address address not found');

          getAllStub.restore();
          deleteAddressStub.restore();
          disableStub.restore();
        });
    });
  });
});
