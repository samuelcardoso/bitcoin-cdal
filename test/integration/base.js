var BOFactory             = require('../../src/business/boFactory');
var WorkerFactory         = require('../../src/workers/workerFactory');
var HelperFactory         = require('../../src/helpers/helperFactory');
var Starter               = require('../../src/starter.js');
var request               = require('supertest');
var chai                  = require('chai');
var expect                = chai.expect;
                            require('../../src/config/database.js')();

describe('integration > base operations', function(){
  var configurationBO = BOFactory.getBO('configuration');
  var addressBO = BOFactory.getBO('address');
  var transactionBO = BOFactory.getBO('transaction');
  var bosWorker = WorkerFactory.getWorker('bos');
  var aapmsWorker = WorkerFactory.getWorker('aapms');
  var starter = new Starter();
  var daemonHelper = HelperFactory.getHelper('daemon');
  var server;

  var firstAddress = null;

  var clearDatabase = function() {
    var chain = Promise.resolve();

    return chain
      .then(function() {
        return configurationBO.clear();
      })
      .then(function() {
        return addressBO.clear();
      })
      .then(function() {
        return transactionBO.clear();
      });
  };

  before(function(){
    var chain = Promise.resolve();

    return chain
      .then(function() {
        return server = require('../../src/server');
      })
      .then(function() {
        return clearDatabase();
      })
      .then(function() {
        return starter.configureDefaultSettings();
      });
  });

  after(function(){
    return clearDatabase();
  });

  it('01 - should sinchronize existing addresses from daemon and maintain the pool', function() {
    this.timeout(50000);

    var chain = Promise.resolve();

    return chain
      .then(function() {
        return aapmsWorker.run();
      })
      .then(function() {
        return addressBO.getFreeAddresses();
      })
      .then(function(r) {
        addresses = r;
        expect(r.length).to.be.at.least(10);
        return daemonHelper.getAddresses();
      })
      .then(function(r) {
        return addressBO.getByAddress(null, r[0]);
      })
      .then(function(r) {
        firstAddress = r;
      });
  });

  it('02 - should create a new address for a ownerId', function() {
    this.timeout(5000);
    return request(server)
      .post('/v1/ownerId/addresses')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(201)
      .then(function() {
        return addressBO.getFreeAddresses();
      })
      .then(function(r) {
        expect(r.length).to.be.equal(addresses.length - 1);
      });
    });


    it('04 - should create a transaction and update the addresses balance', function() {
      this.timeout(20000);
      var secondAddress = null;
      var transactionHash = null;

      return request(server)
        .get('/v1/ownerId/addresses')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(function(res) {
          var addressFound = false;

          res.body.forEach(function(item) {
            if (item.address === firstAddress.address && item.ownerId === 'ownerId') {
              addressFound = true;
            }
          });

          expect(addressFound).to.be.true;

          return addressBO.insertFunds(firstAddress.address, 10, 0);
        })
        .then(function() {
          return request(server)
            .post('/v1/ownerId/addresses')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(201);
          })
          .then(function(res) {
            secondAddress = res.body;

            return request(server)
              .post('/v1/ownerId/transactions')
              .send({
                amount: 1,
                to: secondAddress.address,
                from: firstAddress.address,
                comment: 'comment',
                ownerTransactionId: 'ownerTransactionId'
              })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(201);
        })
        .then(function(res) {
          transactionHash = res.body.transactionHash;

          expect(res.body.createdAt).to.not.be.null;
          expect(res.body.updatedAt).to.not.be.null;
          expect(res.body.transactionHash).to.not.be.null;
          expect(res.body.comment).to.be.equal('comment');
          expect(res.body.commentTo).to.be.equal(firstAddress.address + '@' + secondAddress.address);
          expect(res.body.status).to.be.equal(1);
          expect(res.body.amount).to.be.equal(1);
          expect(res.body.from).to.be.equal(firstAddress.address);
          expect(res.body.to).to.be.equal(secondAddress.address);
          expect(res.body.ownerTransactionId).to.be.equal('ownerTransactionId');

          return bosWorker.synchronizeToBlockchain();
        })
        .then(function() {
          return request(server)
            .get('/v1/addresses/' + secondAddress.address)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200);
        })
        .then(function(res) {
          expect(res.body.balance.locked).to.be.equal(1);
          return request(server)
            .get('/v1/addresses/' + firstAddress.address + '/transactions/' + transactionHash)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200);
        })
        .then(function(res) {
          expect(res.body.transactionHash).to.be.equal(transactionHash);
        });
    });

    /*
    it('05 - should fail to send a transaction with a invalid payload', function() {
      this.timeout(20000);
      var address = null;

      return request(server)
        .get('/v1/ownerId/addresses')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(function(res) {
          address = res.body[0];

          expect(address.ownerId).to.be.equal('ownerId');
          expect(address.address).to.be.equal(firstAddress.address);

          return request(server)
            .post('/v1/ownerId/addresses')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(201);
          })
          .then(function(res) {
            secondAddress = res.body;

            return request(server)
              .post('/v1/ownerId/transactions')
              .send({
                anonymity: 0,
                paymentId:'',
                addresses:[address.address],
                transfers:[
                  {
                    amount: settings.defaultSettings.minimumFee,
                    address: secondAddress.address
                  }
                ],
                changeAddress: address.address
              })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(409);
        })
        .then(function(res) {
          expect(res.body.code).to.be.equal('INVALID_REQUEST');
        });
    });

    it('07 - should fail to send a transaction with an invalid address', function() {
      this.timeout(20000);
      var address = null;

      return request(server)
        .get('/v1/ownerId/addresses')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(function(res) {
          address = res.body[0];

          expect(address.ownerId).to.be.equal('ownerId');
          expect(address.address).to.be.equal(firstAddress.address);

          return request(server)
          .post('/v1/ownerId/addresses')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(201);
        })
        .then(function(res) {
          secondAddress = res.body;

          return request(server)
            .post('/v1/ownerId/transactions')
            .send({
              anonymity: 0,
              fee: settings.defaultSettings.minimumFee,
              paymentId:'',
              addresses:['INVALID'],
              transfers:[
                {
                  amount: settings.defaultSettings.minimumFee,
                  address: secondAddress.address
                }
              ],
              changeAddress: address.address
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(409);
        })
        .then(function(res) {
          expect(res.body.error).to.be.equal('ERROR_TRANSACTION_BAD_ADDRESS');
        });
    });

    it('08 - should fail to send a transaction with an invalid amount', function() {
      this.timeout(20000);
      var address = null;

      return request(server)
        .get('/v1/ownerId/addresses')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(function(res) {
          address = res.body[0];

          expect(address.ownerId).to.be.equal('ownerId');
          expect(address.address).to.be.equal(firstAddress.address);

          return request(server)
          .post('/v1/ownerId/addresses')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(201);
        })
        .then(function(res) {
          secondAddress = res.body;

          return request(server)
            .post('/v1/ownerId/transactions')
            .send({
              anonymity: 0,
              fee: settings.defaultSettings.minimumFee,
              paymentId:'',
              addresses:[address.address],
              transfers:[
                {
                  amount: -settings.defaultSettings.minimumFee,
                  address: secondAddress.address
                }
              ],
              changeAddress: address.address
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(409);
        })
        .then(function(res) {
          expect(res.body.error).to.be.equal('ERROR_TRANSACTION_WRONG_AMOUNT');
        });
    });

    it('09 - should remove all addresses but the first', function() {
      this.timeout(20000);

      var chain = Promise.resolve();

      return chain
        .then(function() {
          return addressBO.getAll();
        })
        .then(function(r) {
          var p = [];
          for (var i = 0; i < r.length; i++) {
            if (r[i].address !== firstAddress.address) {
              p.push(addressBO.delete(null, r[i].address));
            }
          }
          return Promise.all(p);
        })
        .then(function() {
          return addressBO.getAll();
        })
        .then(function(r) {
          expect(r.length).to.be.equal(1);
        });
    });
    */
});
