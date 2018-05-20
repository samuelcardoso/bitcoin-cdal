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
      transactionNotificationAPI: util.format('http://%s/v1/transactions/notifications', process.env.NOTIFICATION_ADDRESS || 'localhost:3001')
    },

    mutex: {
    },

    daemonSettings: {
      host: process.env.DAEMON_RPC_ADDRESS || 'daemons.kernelits.net',
      port: process.env.DAEMON_RPC_PORT || '10464',
      username: process.env.DAEMON_RPC_USER || 'rpc',
      password: process.env.DAEMON_RPC_PASSWORD || 'MwiW0_d46_odBTzhTtUuaJGR4SHDvTOaaClph7737ec=',
      previousBlocksToCheck: 1000,
      useMainAddressBalance: process.env.DAEMON_MAIN_ADDRESS ? true:false,
      mainAddress: process.env.DAEMON_MAIN_ADDRESS || ''
    }
  };
