var DaemonHelper      = require('../../../src/helpers/daemonHelper');
var AddressBO         = require('../../../src/business/addressBO');
var ConfigurationBO   = require('../../../src/business/configurationBO');
var AAPMSWorker       = require('../../../src/workers/aapmsWorker');
var chai              = require('chai');
var sinon             = require('sinon');
var expect            = chai.expect;

describe('Workers > AAPMSWorker > ', function() {
  var daemonHelper = new DaemonHelper({});
  var addressBO = new AddressBO({});
  var configurationBO = new ConfigurationBO({});

  var aapmsWorker = new AAPMSWorker({
    daemonHelper: daemonHelper,
    addressBO: addressBO,
    configurationBO: configurationBO
  });

  var getByKeyStub = sinon.stub(configurationBO, 'getByKey');
  getByKeyStub
    .withArgs('minimumAddressPoolSize')
    .returns(Promise.resolve({
      key: 'minimumAddressPoolSize',
      value: 10
    }));

  it('run', function() {
    var getAddresses = sinon.stub(daemonHelper, 'getAddresses');
    getAddresses
      .withArgs()
      .returns(Promise.resolve(['ADDRESS1', 'ADDRESS2']));

    getByAddressStub = sinon.stub(addressBO, 'getByAddress');
    getByAddressStub
      .withArgs(null, 'ADDRESS1')
      .returns(Promise.resolve({
        address: 'ADDRESS1',
        ownerId: 'ownerId',
        id: 'ID'
      }));
    getByAddressStub
      .withArgs(null, 'ADDRESS2')
      .returns(Promise.resolve(null));

    var registerAddressFromDaemonStub = sinon.stub(addressBO, 'registerAddressFromDaemon');
    registerAddressFromDaemonStub
      .withArgs(null, 'ADDRESS2')
      .returns(Promise.resolve());

    var getFreeAddressesStub = sinon.stub(addressBO, 'getFreeAddresses');
    getFreeAddressesStub
      .withArgs()
      .returns(Promise.resolve([{}, {}, {}]));

    var createAddressFromDaemonStub = sinon.stub(addressBO, 'createAddressFromDaemon');
    createAddressFromDaemonStub
      .withArgs()
      .returns(Promise.resolve({}));

    return aapmsWorker.run()
      .then(function() {
        expect(getAddresses.callCount).to.be.equal(1);
        expect(getByAddressStub.callCount).to.be.equal(2);
        expect(registerAddressFromDaemonStub.callCount).to.be.equal(1);
        expect(getByKeyStub.callCount).to.be.equal(1);
        expect(getFreeAddressesStub.callCount).to.be.equal(1);
        expect(createAddressFromDaemonStub.callCount).to.be.equal(7);

        getAddresses.restore();
        getByAddressStub.restore();
        registerAddressFromDaemonStub.restore();
        createAddressFromDaemonStub.restore();
        getFreeAddressesStub.restore();
      });
  });
});
