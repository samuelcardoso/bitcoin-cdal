var DaemonHelper      = require('../../../src/helpers/daemonHelper');
var chai              = require('chai');
var sinon             = require('sinon');
var Client            = require('bitcoin-core');
var expect            = chai.expect;

describe('business > DaemonHelper', function() {
  var client = new Client();
  var daemonHelper = new DaemonHelper({
    client: client
  });

  it('should run the getAddresses method', function() {
    var clientListAddressGroupings = sinon.stub(client, 'listReceivedByAddress');
    clientListAddressGroupings
      .withArgs(0, true)
      .returns(Promise.resolve([{
        address: '2NFD6QUYxkDMJV5wnXn2AehHDqMd31JdUMP',
        account: '',
        amount: 0,
        confirmations: 0,
        label: '',
        txids: []
      }, {
        address: 'bitcoincash:2NFGQunPE1chxuiMUjck8HF8bfyFzGZryne',
        account: '',
        amount: 0,
        confirmations: 0,
        label: '',
        txids: []
      }]));

    return daemonHelper.getAddresses()
      .then(function(r) {
        expect(r).to.deep.equal([
          '2NFD6QUYxkDMJV5wnXn2AehHDqMd31JdUMP',
          'bitcoincash:2NFGQunPE1chxuiMUjck8HF8bfyFzGZryne'
        ]);
      });
  });

  it('should not fail when sendTransaction method fails', function() {
    var sendToAddressStub = sinon.stub(client, 'sendToAddress');
    sendToAddressStub
      .withArgs('address', 1, 'comment', 'toComment')
      .returns(Promise.reject({
        message:'Loading block index...',
        code:-28,
        name:'RpcError'
      }));

    return daemonHelper.sendTransaction('address', 1, 'comment', 'toComment')
      .then(function(r) {
        throw r;
      })
      .catch(function(e) {
        expect(e.code).to.be.equal(-28);
        sendToAddressStub.restore();
      });
  });
});
