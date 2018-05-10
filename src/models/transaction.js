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
    amount: {
      type: Number,
      required: true
    },
    isConfirmed: {
      type: Boolean,
      required: true
    },
    notifications: {
      creation: {
        isNotified: {
          type: Boolean,
          required: true
        },
        notifiedAt: {
          type: Date,
          required: false
        },
      },
      confirmation: {
        isNotified: {
          type: Boolean,
          required: true
        },
        notifiedAt: {
          type: Date,
          required: false
        },
      }
    },
    blockIndex: {
      type: Number,
      required: true
    },
    transactionHash: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    timestamp: {
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
    }
  });

  model = model ? model : mongoose.model('transactions', schema);

  return model;
};
