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
    var clientListAddressGroupings = sinon.stub(client, 'listAddressGroupings');
    clientListAddressGroupings
      .withArgs()
      .returns(Promise.resolve(
        [
          [
            ['mrouCPEjbURBWMgG8J77Pd7zpPwigsh2Ne', 0]
          ],
          [
            ['mtuDYkaC7nbC6FU51raS228UKn7EycxKco', 0]
          ],
          [
            ['2Mt2EN7rGd3wwZoCkYVvufPbQ25oFqF6Hz6', 18.24691356, ''],
            ['2MwPsSdn4eGTwJj1PJLW2r6WH9zcgVtUcgH', 289, 'kaplan'],
            ['2N6KFbCPKpLTQCjZspLeKgscWkDRbWgJrvT', 0],
            ['2N6fSbGBPezEy9CmYPPNKBvj5pzHicEkTKA', 0],
            ['2N7xCyiLzfp9CZtoBZoEjccSJfaodmmLbiZ', 0],
            ['2NAT5ymRWnm9pTuCJrakU3taviZtWmqkTbY', 14492.75288254, ''],
            ['2NBGmuJQz8h3MPyj2wRC3bWJ52qTWJmskQY', 0.0000482],
            ['2NGXBSbaiQoqVTnRq4VR37k1bxuLc2Vasn9', 0.0001392]
          ]
        ]));

    return daemonHelper.getAddresses()
      .then(function(r) {
        expect(r).to.deep.equal([
          'mrouCPEjbURBWMgG8J77Pd7zpPwigsh2Ne',
          'mtuDYkaC7nbC6FU51raS228UKn7EycxKco',
          '2Mt2EN7rGd3wwZoCkYVvufPbQ25oFqF6Hz6',
          '2MwPsSdn4eGTwJj1PJLW2r6WH9zcgVtUcgH',
          '2N6KFbCPKpLTQCjZspLeKgscWkDRbWgJrvT',
          '2N6fSbGBPezEy9CmYPPNKBvj5pzHicEkTKA',
          '2N7xCyiLzfp9CZtoBZoEjccSJfaodmmLbiZ',
          '2NAT5ymRWnm9pTuCJrakU3taviZtWmqkTbY',
          '2NBGmuJQz8h3MPyj2wRC3bWJ52qTWJmskQY',
          '2NGXBSbaiQoqVTnRq4VR37k1bxuLc2Vasn9',
        ]);
      });
  });
});
