var TransactionBO     = require('../../../src/business/transactionBO');
var AddressBO         = require('../../../src/business/addressBO');
var ModelParser       = require('../../../src/models/modelParser');
var DaemonHelper      = require('../../../src/helpers/daemonHelper');
var DateHelper        = require('../../../src/helpers/dateHelper');
var DAOFactory        = require('../../../src/daos/daoFactory');
var chai              = require('chai');
var sinon             = require('sinon');
var expect            = chai.expect;

describe('Business > TransactionBO > ', function() {
  var transactionDAO = DAOFactory.getDAO('transaction');
  var transactionRequestDAO = DAOFactory.getDAO('transactionRequest');
  var blockchainTransactionDAO = DAOFactory.getDAO('blockchainTransaction');
  var addressDAO = DAOFactory.getDAO('address');
  var dateHelper = new DateHelper();
  var modelParser = new ModelParser();
  var addressBO = new AddressBO({});
  var daemonHelper = new DaemonHelper({});

  var transactionBO = new TransactionBO({
    transactionRequestDAO: transactionRequestDAO,
    blockchainTransactionDAO: blockchainTransactionDAO,
    transactionDAO: transactionDAO,
    addressBO: addressBO,
    addressDAO: addressDAO,
    modelParser: modelParser,
    dateHelper: dateHelper,
    daemonHelper: daemonHelper
  });

  describe('Methods > ', function() {
    it('clear', function() {
      var clearStub = sinon.stub(transactionDAO, 'clear');
      clearStub
        .withArgs()
        .returns(Promise.resolve());

      return transactionBO.clear()
        .then(function(){
          expect(clearStub.callCount).to.be.equal(1);
          clearStub.restore();
        });
    });

    it('getAll', function() {
      var getAllStub = sinon.stub(transactionDAO, 'getAll');
      getAllStub
        .withArgs({})
        .returns(Promise.resolve([{_id: 'ID'}]));

      return transactionBO.getAll()
        .then(function(r){
          expect(r[0].id).to.be.equal('ID');
          expect(getAllStub.callCount).to.be.equal(1);

          getAllStub.restore();
        });
    });

    it('save', function() {
      var now = new Date();
      dateHelper.setNow(now);

      var transactionRequestSaveStub = sinon.stub(transactionRequestDAO, 'save');
      transactionRequestSaveStub
        .withArgs({
          ownerId: 'ownerId',
          transactionOwnerId: 'transactionOwnerId',
          from: 'addressFrom',
          to: 'addressTo',
          amount: 1,
          status: 0,
          comment: 'comment',
          commentTo: 'addressFrom@addressTo',
          createdAt: now
        })
        .returns(Promise.resolve({
          _id: 'ID',
          ownerId: 'ownerId',
          transactionOwnerId: 'transactionOwnerId',
          from: 'addressFrom',
          to: 'addressTo',
          amount: 1,
          status: 0,
          comment: 'comment',
          commentTo: 'addressFrom@addressTo',
          createdAt: now
        }));

      var sendTransactionStub = sinon.stub(daemonHelper, 'sendTransaction');
      sendTransactionStub
        .withArgs(
          'addressTo',
          1,
          'comment',
          'addressFrom@addressTo'
        )
        .returns(Promise.resolve('txid'));

      var getTransactionStub = sinon.stub(daemonHelper, 'getTransaction');
      getTransactionStub
        .withArgs('txid')
        .returns(Promise.resolve({
            amount: 0,
            fee: -0.000197,
            confirmations: 7220,
            blockhash:'02ae1f8c2ebe394be130ba0df2dfcdb463fa10766de2c6f6505f4470d1b08c52',
            blockindex:1,
            blocktime: 1525771681,
            txid:'txid',
            walletconflicts:[],
            time: 1525771674,
            timereceived: 1525771674,
            'bip125-replaceable':'no',
            comment:'comment',
            to: 'addressFrom@addressTo',
            details:[{
              account: '',
              address: 'addressFrom',
              category: 'send',
              amount: -1,
              label: '',
              vout: 0,
              fee: -0.000197,
              abandoned: false
            },{
              account: '',
              address: 'addressTo',
              category: 'receive',
              amount: 1,
              label: '',
              vout: 0
            }
          ]
        }));


      var transactionRequestUpdateStub = sinon.stub(transactionRequestDAO, 'update');
      transactionRequestUpdateStub
        .withArgs({
          _id: 'ID',
          ownerId: 'ownerId',
          transactionOwnerId: 'transactionOwnerId',
          to: 'addressTo',
          from: 'addressFrom',
          amount: 1,
          status: 1,
          comment: 'comment',
          commentTo: 'addressFrom@addressTo',
          createdAt: now,
          updatedAt: now,
          transactionHash: 'txid',
          fee: 0.000197
        })
        .returns(Promise.resolve({
          _id: 'ID',
          ownerId: 'ownerId',
          transactionOwnerId: 'transactionOwnerId',
          to: 'addressTo',
          from: 'addressFrom',
          amount: 1,
          status: 1,
          comment: 'comment',
          commentTo: 'addressFrom@addressTo',
          createdAt: now,
          updatedAt: now,
          transactionHash: 'txid',
          fee: 0.000197
        }));

      var withdrawStub = sinon.stub(addressBO, 'withdraw');
      withdrawStub
        .withArgs('addressFrom', 1.000197, 1)
        .returns(Promise.resolve());

      var getByAddressStub = sinon.stub(addressBO, 'getByAddress');
      getByAddressStub
        .withArgs(null, 'addressTo')
        .returns(Promise.resolve({
          address: 'addressTo'
        }));


      var depositStub = sinon.stub(addressBO, 'deposit');
      depositStub
        .withArgs('addressFrom', 1.000197, 1)
        .returns(Promise.resolve());

      return transactionBO.save({
        ownerId: 'ownerId',
        transactionOwnerId: 'transactionOwnerId',
        from: 'addressFrom',
        to: 'addressTo',
        amount: 1,
        comment: 'comment'
      })
        .then(function(r){
          expect(r).to.be.deep.equal({
            id: 'ID',
            ownerId: 'ownerId',
            transactionOwnerId: 'transactionOwnerId',
            to: 'addressTo',
            from: 'addressFrom',
            amount: 1,
            status: 1,
            comment: 'comment',
            commentTo: 'addressFrom@addressTo',
            createdAt: now,
            updatedAt: now,
            transactionHash: 'txid',
            fee: 0.000197
          });

          transactionRequestSaveStub.restore();
          transactionRequestUpdateStub.restore();
          sendTransactionStub.restore();
          getTransactionStub.restore();
          withdrawStub.restore();
          getTransactionStub.restore();
          getByAddressStub.restore();
          depositStub.restore();
        });
    });

    it('parseTransaction - transaction not found', function() {
      var now = new Date();
      var getNowStub = sinon.stub(dateHelper, 'getNow');
      getNowStub
        .withArgs()
        .returns(now);

      var getAll = sinon.stub(blockchainTransactionDAO, 'getAll');
      getAll
        .withArgs({
          transactionHash: 'transactionHash'
        })
        .returns(Promise.resolve([]));

      var transactionRequestGetAllStub = sinon.stub(transactionRequestDAO, 'getAll');
      transactionRequestGetAllStub
        .withArgs({
          transactionHash: 'transactionHash'
        })
        .returns(Promise.resolve([{
          ownerTransactionId: 'ownerTransactionId'
        }]));

      var saveStub = sinon.stub(blockchainTransactionDAO, 'save');
      saveStub
        .withArgs({
          transactionHash: 'transactionHash',
          blockIndex: 1,
          timestamp: 2,
          createdAt: now,
          isEnabled: true,
          isConfirmed: false,
          transfers:[{
            address: 'ADDRESS1',
            amount: 100000000,
            type: 0
          },
          {
            address: 'ADDRESS2',
            amount: 100000000,
            type: 0
          },
          {
            address: 'ADDRESS3',
            amount: 290000000,
            type:2
          },
          {
            address: 'ADDRESS3',
            amount: -500000000,
            type:0
          }]
        })
        .returns(Promise.resolve({
          _id: 'ID',
          transactionHash: 'transactionHash',
          blockIndex: 1,
          timestamp: 2,
          createdAt: now,
          transfers:[{
            address:'ADDRESS1',
            amount: 100000000,
            type:0
          },
          {
            address:'ADDRESS2',
            amount: 100000000,
            type:0
          },
          {
            address:'ADDRESS3',
            amount: 290000000,
            type:2
          },
          {
            address:'ADDRESS3',
            amount: -500000000,
            type:0
          }]
        }));

      var getByAddressStub = sinon.stub(addressBO, 'getByAddress');
      getByAddressStub
        .withArgs(null, 'ADDRESS1')
        .returns(Promise.resolve({
          address: 'ADDRESS1',
          ownerId: 'ownerId'
        }));
      getByAddressStub
        .withArgs(null, 'ADDRESS2')
        .returns(Promise.resolve(null));
      getByAddressStub
        .withArgs(null, 'ADDRESS3')
        .returns(Promise.resolve({
          address: 'ADDRESS3',
          ownerId: 'ownerId'
        }));

      var transactionSaveStub = sinon.stub(transactionDAO, 'save');
      transactionSaveStub
        .withArgs({
          ownerId: 'ownerId',
          ownerTransactionId: 'ownerTransactionId',
          amount: 100000000,
          isConfirmed: false,
          isNotified: false,
          blockIndex: 1,
          transactionHash: 'transactionHash',
          address: 'ADDRESS1',
          createdAt: now
        })
        .returns(Promise.resolve({
          _id: 'ID',
          ownerId: 'ownerId',
          ownerTransactionId: 'ownerTransactionId',
          amount: 100000000,
          isConfirmed: false,
          isNotified: false,
          blockIndex: 1,
          transactionHash: 'transactionHash',
          address: 'ADDRESS1',
          createdAt: now
        }));
      transactionSaveStub
        .withArgs({
          ownerId: 'ownerId',
          ownerTransactionId: 'ownerTransactionId',
          amount: -210000000,
          isConfirmed: false,
          isNotified: false,
          blockIndex: 1,
          transactionHash: 'transactionHash',
          address: 'ADDRESS3',
          createdAt: now
        })
        .returns(Promise.resolve({
          _id: 'ID',
          ownerId: 'ownerId',
          ownerTransactionId: 'ownerTransactionId',
          amount: 100000000,
          isConfirmed: false,
          isNotified: false,
          blockIndex: 1,
          transactionHash: 'transactionHash',
          address: 'ADDRESS1',
          createdAt: now
        }));

      return transactionBO.parseTransaction({
          transactionHash: 'transactionHash',
          blockIndex: 1,
          timestamp: 2,
          transfers:[{
            address:'ADDRESS1',
            amount:100000000,
            type:0
          },
          {
            address:'ADDRESS2',
            amount: 100000000,
            type:0
          },
          {
            address:'ADDRESS3',
            amount: 290000000,
            type:2
          },
          {
            address:'ADDRESS3',
            amount: -500000000,
            type:0
          }]
        })
        .then(function(r){
          expect(r).to.be.deep.equal({
            id: 'ID',
            blockIndex: 1,
            timestamp: 2,
            transactionHash: 'transactionHash',
            createdAt: now,
            transfers:[{
              address:'ADDRESS1',
              amount:100000000,
              type:0
            },
            {
              address:'ADDRESS2',
              amount: 100000000,
              type:0
            },
            {
              address:'ADDRESS3',
              amount: 290000000,
              type:2
            },
            {
              address:'ADDRESS3',
              amount: -500000000,
              type:0
            }]
          });
          expect(getNowStub.callCount).to.be.equal(3);
          expect(getAll.callCount).to.be.equal(1);
          expect(transactionRequestGetAllStub.callCount).to.be.equal(1);
          expect(saveStub.callCount).to.be.equal(1);
          expect(getByAddressStub.callCount).to.be.equal(3);
          expect(transactionSaveStub.callCount).to.be.equal(2);

          getNowStub.restore();
          getAll.restore();
          transactionRequestGetAllStub.restore();
          saveStub.restore();
          transactionSaveStub.restore();
          getByAddressStub.restore();
        });
    });

    it('parseTransaction - transaction found', function() {
      var now = new Date();
      var getNowStub = sinon.stub(dateHelper, 'getNow');
      getNowStub
        .withArgs()
        .returns(now);

      var getAll = sinon.stub(blockchainTransactionDAO, 'getAll');
      getAll
        .withArgs({
          transactionHash: 'transactionHash'
        })
        .returns(Promise.resolve([{
          _id: 'ID',
          transactionHash: 'transactionHash',
          blockIndex: 1,
          timestamp: 2,
          createdAt: now,
          updatedAt: now
        }]));

      var saveStub = sinon.stub(blockchainTransactionDAO, 'update');
      saveStub
        .withArgs({
          _id: 'ID',
          transactionHash: 'transactionHash',
          blockIndex: 1,
          timestamp: 2,
          createdAt: now,
          updatedAt: now
        })
        .returns(Promise.resolve({
          _id: 'ID',
          transactionHash: 'transactionHash',
          blockIndex: 1,
          timestamp: 2,
          createdAt: now,
          updatedAt: now
        }));

      var updateTransactionInfoStub = sinon.stub(transactionDAO, 'updateTransactionInfo');
      updateTransactionInfoStub
        .withArgs('transactionHash', 1, 2)
        .returns(Promise.resolve({}));

      return transactionBO.parseTransaction({
          transactionHash: 'transactionHash',
          blockIndex: 1,
          timestamp: 2
        })
        .then(function(r){
          expect(r).to.be.deep.equal({
            id: 'ID',
            createdAt: now,
            blockIndex: 1,
            timestamp: 2,
            transactionHash: 'transactionHash',
            updatedAt: now
          });
          expect(getNowStub.callCount).to.be.equal(1);
          expect(getAll.callCount).to.be.equal(1);
          expect(saveStub.callCount).to.be.equal(1);
          expect(updateTransactionInfoStub.callCount).to.be.equal(1);

          getNowStub.restore();
          getAll.restore();
          saveStub.restore();
          updateTransactionInfoStub.restore();
        });
    });

    it('updateIsConfirmedFlag', function() {
      var updateIsConfirmedFlagStub = sinon.stub(transactionDAO, 'updateIsConfirmedFlag');
      updateIsConfirmedFlagStub
        .withArgs(1)
        .returns(Promise.resolve());
      var updateIsConfirmedFlag2Stub = sinon.stub(blockchainTransactionDAO, 'updateIsConfirmedFlag');
      updateIsConfirmedFlag2Stub
        .withArgs(1)
        .returns(Promise.resolve());

      return transactionBO.updateIsConfirmedFlag(1)
        .then(function(){
          expect(updateIsConfirmedFlagStub.callCount).to.be.equal(1);
          expect(updateIsConfirmedFlag2Stub.callCount).to.be.equal(1);
          updateIsConfirmedFlagStub.restore();
          updateIsConfirmedFlag2Stub.restore();
        });
    });

    it('getByTransactionHash - transaction not found', function() {
      var getAllStub = sinon.stub(transactionDAO, 'getAll');
      getAllStub
        .withArgs({transactionHash: 'transactionHash'})
        .returns(Promise.resolve([]));

      return transactionBO.getByTransactionHash('transactionHash')
        .then(function(){
          expect(getAllStub.callCount).to.be.equal(1);
          getAllStub.restore();
        });
    });

    it('getByTransactionHash - transaction found', function() {
      var getAllStub = sinon.stub(transactionDAO, 'getAll');
      getAllStub
        .withArgs({transactionHash: 'transactionHash'})
        .returns(Promise.resolve([{_id: 'ID'}]));

      return transactionBO.getByTransactionHash('transactionHash')
        .then(function(r){
          expect(r._id).to.be.equal('ID');
          expect(getAllStub.callCount).to.be.equal(1);
          getAllStub.restore();
        });
    });

    it('getTransactionRequestByTransactionHash - transaction found', function() {
      var getAllStub = sinon.stub(transactionRequestDAO, 'getAll');
      getAllStub
        .withArgs({transactionHash: 'transactionHash'})
        .returns(Promise.resolve([]));

      return transactionBO.getTransactionRequestByTransactionHash('transactionHash')
        .then(function(r){
          expect(r).to.be.null;
          expect(getAllStub.callCount).to.be.equal(1);
          getAllStub.restore();
        });
    });
  });
});
