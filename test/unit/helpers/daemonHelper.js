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
        address: '2NFGQunPE1chxuiMUjck8HF8bfyFzGZryne',
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
          '2NFGQunPE1chxuiMUjck8HF8bfyFzGZryne'
        ]);
      });
  });
});
