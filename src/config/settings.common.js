var util      = require('util');

module.exports = {
    mongoUrl : util.format('mongodb://%s/%s',
                      process.env.DB_SERVER || 'localhost',
                      process.env.DB_NAME   || 'bitcoin-services'),
    servicePort : process.env.PORT || 4000,
    isMongoDebug : true,
    jwt: {
      secret: 'SECRET_DEV',
      expiresIn: '1h'
    },

    defaultSettings: {
      minimumConfirmations: 6,
      minimumAddressPoolSize: 100,
      transactionNotificationAPI: util.format('http://%s/v1/transactions/notifications', process.env.NOTIFICATION_ADDRESS || 'localhost:3001'),
      daemonEndpoint: util.format('http://%s/json_rpc', process.env.DAEMON_ADDRESS || '18.216.105.158:20264')
    },

    mutex: {
    },

    daemonSettings: {
      host: 'daemons.kernelits.net',
      port:'10464',
      username: 'rpc',
      password: 'MwiW0_d46_odBTzhTtUuaJGR4SHDvTOaaClph7737ec='
    }
  };
