var util      = require('util');

module.exports = {
    mongoUrl : util.format('mongodb://%s/%s',
                      process.env.DB_SERVER,
                      process.env.DB_NAME),
    servicePort : process.env.PORT,
    isMongoDebug : true,
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: '1h'
    },

    defaultSettings: {
      minimumConfirmations: 6,
      minimumAddressPoolSize: 0,
      currentBlockNumber: 1000,
      transactionNotificationAPI: process.env.NOTIFICATION_API_ADDRESS
    },

    mutex: {
      host: process.env.REDIS_DB_SERVER
    },

    daemonSettings: {
      host: process.env.DAEMON_RPC_ADDRESS,
      port: process.env.DAEMON_RPC_PORT,
      username: process.env.DAEMON_RPC_USER,
      password: process.env.DAEMON_RPC_PASSWORD,
      previousBlocksToCheck: 1000,
      useMainAddressBalance: process.env.DAEMON_MAIN_ADDRESS ? true : false,
      mainAddress: process.env.DAEMON_MAIN_ADDRESS || ''
    }
  };
