var mongoose = require('mongoose');
var mongooseSchema =  mongoose.Schema;

var model = null;

module.exports = function(){
  var schema = mongooseSchema({
    ownerId: {
      type: String,
      required: false,
    },
    ownerTransactionId: {
      type: String,
      required: false,
    },
    transactionHash: {
      type: String,
      required: false
    },
    from: {
      type: String,
      required: true
    },
    to: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: Number,
      required: false
    },
    fee: {
      type: Number,
      required: false
    },
    createdAt: {
      type: Date,
      required: false,
    },
    updatedAt: {
      type: Date,
      required: false,
    }
  });

  model = model ? model : mongoose.model('transactionRequests', schema);

  return model;
};
