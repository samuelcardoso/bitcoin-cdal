var DaemonHelper      = require('../../../src/helpers/daemonHelper');
var TransactionBO     = require('../../../src/business/transactionBO');
var AddressBO         = require('../../../src/business/addressBO');
var ConfigurationBO   = require('../../../src/business/configurationBO');
var BOSWorker         = require('../../../src/workers/bosWorker');
var chai              = require('chai');
var sinon             = require('sinon');
var expect            = chai.expect;

describe('Workers > BOSWorker', function() {
  var daemonHelper = new DaemonHelper({});
  var transactionBO = new TransactionBO({});
  var addressBO = new AddressBO({});
  var configurationBO = new ConfigurationBO({});

  var bosWorker = new BOSWorker({
    daemonHelper: daemonHelper,
    transactionBO: transactionBO,
    addressBO: addressBO,
    configurationBO: configurationBO
  });

  var getByKeyStub = sinon.stub(configurationBO, 'getByKey');
  getByKeyStub
    .withArgs('minimumConfirmations')
    .returns(Promise.resolve({
      key: 'minimumConfirmations',
      value: 3
    }));

  it('should run', function() {
    var now = new Date();

    var getBlockCountStub = sinon.stub(daemonHelper, 'getBlockCount');
    getBlockCountStub
      .withArgs()
      .returns(Promise.resolve(10));

    var getBlockHashStub = sinon.stub(daemonHelper, 'getBlockHash');
    getBlockHashStub
      .withArgs(7)
      .returns(Promise.resolve('127e38ed8be22414326fe6465d54025b89047fc676324efe51c27e99b963973b'));

    var transactions = [{
      address: '2N6NzVhB5JYzoJDahoauvwSEAJ2gmF5C4sJ',
      category: 'receive',
      amount: 1.890,
      label: '',
      blockhash: '0fcab413728d24bc507b7811cde4d60bd55d0383a2b419c99b09cab344f55588',
      blocktime: 1525944061,
      txid: '028b3d59339b9fa8f8cb8ab9ec1e659ab168bb29663bced882c823db4657bfd2',
      isConfirmed: false,
      time: 1525944061,
      timereceived: 1525944061,
      createdAt: now,
      updatedAt: now,
      to: '3N6NzVhB5JYzoJDahoauvwSEAJ2gmF5C4sJ@2N6NzVhB5JYzoJDahoauvwSEAJ2gmF5C4sJ'
    }, {account: '',
     address: '2N6NzVhB5JYzoJDahoauvwSEAJ2gmF5C4sJ',
     category: 'send',
     amount: -1.11,
     fee: -0.0008,
     label: '',
     vout: 0,
     confirmations: 5,
     generated: true,
     blockhash: '0b6b308caa3a625cd98732b8cd96c59b78a7dc0a82e089027bad6c2dd703a5d8',
     blockindex: 0,
     blocktime: 1525988282,
     txid: 'c85f98664eb36d20d318e908691a6bc5e291e01c38424669d92449691bcd12a7',
     walletconflicts: [],
     time: 1525988282,
     timereceived: 1525988282,
     'bip125-replaceable': 'no'}];

    var listSinceBlockStub = sinon.stub(daemonHelper, 'listSinceBlock');
    listSinceBlockStub
      .withArgs('127e38ed8be22414326fe6465d54025b89047fc676324efe51c27e99b963973b')
      .returns(Promise.resolve({transactions: transactions}));

    var parseTransactionStub = sinon.stub(transactionBO, 'parseTransaction');
    parseTransactionStub
      .withArgs(transactions[0])
      .returns(Promise.resolve());

    parseTransactionStub
      .withArgs(transactions[0])
      .returns(Promise.resolve());

    return bosWorker.synchronizeToBlockchain()
      .then(function(r) {
        expect(r).to.be.true;
        expect(getBlockCountStub.callCount).to.be.equal(1);
        expect(getBlockHashStub.callCount).to.be.equal(1);
        expect(listSinceBlockStub.callCount).to.be.equal(1);
        expect(parseTransactionStub.callCount).to.be.equal(2);

        getBlockCountStub.restore();
        getBlockHashStub.restore();
        listSinceBlockStub.restore();
        parseTransactionStub.restore();
      });
  });

  it('should not fail when the daemon returns an error (getBlockCount)', function() {
    var getBlockCountStub = sinon.stub(daemonHelper, 'getBlockCount');
    getBlockCountStub
      .withArgs()
      .returns(Promise.reject());

    return bosWorker.synchronizeToBlockchain()
      .then(function(r) {
        expect(r).to.be.true;
        expect(getBlockCountStub.callCount).to.be.equal(1);

        getBlockCountStub.restore();
      });
  });
});
