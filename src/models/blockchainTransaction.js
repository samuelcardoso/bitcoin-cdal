var mongoose = require('mongoose');
var mongooseSchema =  mongoose.Schema;

var model = null;

module.exports = function(){
  var schema = mongooseSchema({
    category: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
    },
    label: {
      type: String,
      required: false
    },
    blockhash: {
      type: String,
      required: true
    },
    blocktime: {
      type: Number,
      required: true
    },
    txid: {
      type: String,
      required: true
    },
    fee: {
      type: Number,
      required: false
    },
    isConfirmed: {
      type: Boolean,
      required: false
    },
    time: {
      type: Number,
      required: true
    },
    timereceived: {
      type: Number,
      required: true
    },
    createdAt: {
      type: Date,
      required: false,
    },
    updatedAt: {
      type: Date,
      required: false,
    },
    to: {
      type: String,
      required: false
    }
  });

  model = model ? model : mongoose.model('blockchainTransactions', schema);

  return model;
};
