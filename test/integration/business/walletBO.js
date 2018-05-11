var BOFactory             = require('../../../src/business/boFactory');
var chai                  = require('chai');
var Starter               = require('../../../src/starter.js');
var expect                = chai.expect;
                            require('../../../src/config/database.js')();

describe('integration > base operations', function(){
  var configurationBO = BOFactory.getBO('configuration');
  var addressBO = BOFactory.getBO('address');
  var transactionBO = BOFactory.getBO('transaction');
  var starter = new Starter();

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
        return clearDatabase();
      })
      .then(function() {
        return starter.configureDefaultSettings();
      });
  });

  after(function(){
    return clearDatabase();
  });

  describe('operations in the wallet (parse cdal transaction, deposits and withdrawals)', function() {
    it('should parse receive transactions from blockchain', function() {
      var chain = Promise.resolve();

      return chain
        .then(function() {
          var p = [];

          p.push(transactionBO.parseTransaction({
            account: '',
            address: '2MzpBrGk3PpRSdfb5Q9YAWkQQ1n33NamJvP',
            category: 'receive',
            amount: 10,
            label: '',
            vout: 1,
            confirmations: 36040,
            blockhash: '0f959add21e2f8603d0659150f005fe24d99bd534197af401c9c94fee650525e',
            blockindex: 1,
            blocktime: 1525843021,
            txid: '9304191b2e5323df80fbb6e9e841862d2eb3b316586364afde367070f08ee206',
            walletconflicts: [],
            time: 1525842996,
            timereceived: 1525842996,
            'bip125-replaceable': 'no'
          }));

          p.push(transactionBO.parseTransaction({
            account: '',
            address: '2MzpBrGk3PpRSdfb5Q9YAWkQQ1n33NamJvP',
            category: 'receive',
            amount: 1400,
            label: '',
            vout: 0,
            confirmations: 4260,
            blockhash: '2b3a408913f29a03710bd4066edcc86ef6f06e50d5630ffa72ab7414c57c60fd',
            blockindex: 1,
            blocktime: 1526034841,
            txid: '4a745728dda57740f197018999938a31174ae00e52d4eb0a477fa8b0ae8d50c6',
            walletconflicts: [],
            time: 1526034803,
            timereceived: 1526034803,
            'bip125-replaceable': 'no'
          }));

          p.push(transactionBO.parseTransaction({
            account: '',
            address: '2MzpBrGk3PpRSdfb5Q9YAWkQQ1n33NamJvP',
            category: 'receive',
            amount: 500,
            label: '',
            vout: 1,
            confirmations: 1,
            blockhash: '2d172462491d73aa7e30ab2faf1782ef192497e148c8f43f68b7b399c0f7f347',
            blockindex: 1,
            blocktime: 1525843621,
            txid: '57b61e73faaff7dea1b958681d910d892702aad060124c64ab0f08309376050e',
            walletconflicts: [],
            time: 1525843584,
            timereceived: 1525843584,
            'bip125-replaceable': 'no'
          }));

          return Promise.all(p);
        })
        .then(function() {
          return addressBO.getByAddress(null, '2MzpBrGk3PpRSdfb5Q9YAWkQQ1n33NamJvP');
        })
        .then(function(r) {
          console.log(r);
          expect(r.balance.available).to.be.equal(1410);
          expect(r.balance.locked).to.be.equal(500);
        });
    });

    it('should parse an unconfirmed send transaction from blockchain', function() {
      var chain = Promise.resolve();

      return chain
        .then(function() {
          return transactionBO.parseTransaction({
            account: '',
            address: '2MzpBrGk3PpRSdfb5Q9YAWkQQ1n33NamJvP',
            category: 'send',
            amount: -500,
            fee: -0.00000892,
            label: '',
            vout: 1,
            confirmations: 1,
            blockhash: '3d172462491d73aa7e30ab2faf1782ef192497e148c8f43f68b7b399c0f7f347',
            blockindex: 1,
            blocktime: 1525843621,
            txid: '67b61e73faaff7dea1b958681d910d892702aad060124c64ab0f08309376050e',
            walletconflicts: [],
            time: 1525843584,
            timereceived: 1525843584,
            'bip125-replaceable': 'no'
          });
        })
        .then(function() {
          return addressBO.getByAddress(null, '2MzpBrGk3PpRSdfb5Q9YAWkQQ1n33NamJvP');
        })
        .then(function(r) {
          expect(r.balance.available).to.be.equal(909.99999108);
          expect(r.balance.locked).to.be.equal(1000.00000892);
        });
    });

    it('should parse a confirmed send transaction that already exists at database', function() {
      var chain = Promise.resolve();

      return chain
        .then(function() {
          return transactionBO.parseTransaction({
            account: '',
            address: '2MzpBrGk3PpRSdfb5Q9YAWkQQ1n33NamJvP',
            category: 'send',
            amount: -500,
            fee: -0.00000892,
            label: '',
            vout: 1,
            confirmations: 5,
            blockhash: '3d172462491d73aa7e30ab2faf1782ef192497e148c8f43f68b7b399c0f7f347',
            blockindex: 1,
            blocktime: 1525843621,
            txid: '67b61e73faaff7dea1b958681d910d892702aad060124c64ab0f08309376050e',
            walletconflicts: [],
            time: 1525843584,
            timereceived: 1525843584,
            'bip125-replaceable': 'no'
          });
        })
        .then(function() {
          return addressBO.getByAddress(null, '2MzpBrGk3PpRSdfb5Q9YAWkQQ1n33NamJvP');
        })
        .then(function(r) {
          console.log(r);
          expect(r.balance.available).to.be.equal(909.99999108);
          expect(r.balance.locked).to.be.equal(500);
        });
    });
  });
});
