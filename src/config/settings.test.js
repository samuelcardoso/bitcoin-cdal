module.exports = {
    mongoUrl : 'mongodb://localhost/cdal-services-test',
    servicePort : 4100,
    isMongoDebug : true,

    defaultSettings: {
      minimumConfirmations: 3,
      minimumAddressPoolSize: 10,
      transactionNotificationAPI: 'http://localhost:3001/v1/transactions/notifications',
      daemonEndpoint: 'http://18.216.105.158:20264/json_rpc',
    }
};
