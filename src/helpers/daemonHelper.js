module.exports = function(dependencies) {
  var client = dependencies.client;

  return {
    getAddresses: function() {
      return new Promise(function(resolve, reject) {
        var chain = Promise.resolve();
        return chain
          .then(function() {
            return client.listReceivedByAddress(0, true);
          })
          .then(function(r) {
            var addresses = [];

            r.forEach(function(item) {
              if (item.address && item.address.startsWith('bitcoincash:')) {
                addresses.push(item.address.split('bitcoincash:')[1]);
              } else {
                addresses.push(item.address);
              }
            });

            addresses.sort();
            return addresses;
          })
          .then(resolve)
          .catch(reject);
      });
    },

    createAddress: function() {
      return client.getNewAddress()
        .then(function(r) {
          if (r && r.startsWith('bitcoincash:')) {
            return r.split('bitcoincash:')[1];
          } else {
            return r;
          }
        });
    },

    getBalance: function() {
      return client.getBalance();
    },

    getBlockCount: function() {
      return client.getBlockCount();
    },

    getBlockHash: function(blocknumber) {
      return client.getBlockHash(blocknumber);
    },

    listSinceBlock: function(blockash) {
      return client.listSinceBlock(blockash);
    },

    estimateSmartFee: function(blocks) {
      return new Promise(function(resolve, reject) {
        return client.estimateSmartFee(blocks || 6)
          .then(function(r) {
            if (!isNaN(r)) {
              return r;
            } else {
              return 0;
            }
          })
          .then(resolve)
          .catch(reject);
      });
    },

    getTransaction: function(txid) {
      return client.getTransaction(txid);
    },

    sendTransaction: function(address, amount, comment, toComment) {
      return client.sendToAddress(address, amount, comment, toComment);
    }
  };
};
