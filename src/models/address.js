var mongoose = require('mongoose');
var mongooseSchema =  mongoose.Schema;

var model = null;

module.exports = function(){
  var schema = mongooseSchema({
    ownerId: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: true,
    },
    balance: {
      available: {
        type: Number,
        required: true,
      },
      locked: {
        type: Number,
        required: true
      }
    },
    createdAt: {
      type: Date,
      required: false,
    },
    updatedAt: {
      type: Date,
      required: false,
    },
    isEnabled: {
      type: Boolean,
      required: true
    }
  });

  model = model ? model : mongoose.model('addresses', schema);

  return model;
};
