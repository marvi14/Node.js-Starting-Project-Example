var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

module.exports = function (db) {
  var userSchema = {
    profile: {
      username: {
        type: String,
        required: true,
        lowercase: true
      },
      password: {
        type: String,
        required: true
      },
      picture: {
        type: String,
        match: /^http:\/\//i
      }
    },
    data: {
      oauth: { type: String },
      cart: [{
        product: {
          type: mongoose.Schema.Types.ObjectId
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1
        }
      }]
    }
  };

  var schema = new mongoose.Schema(userSchema);
  // generating a hash
  schema.methods.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
  };
  // checking if password is valid
  schema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.profile.password);
  };

  schema.set('toObject', { virtuals: true });
  schema.set('toJSON', { virtuals: true });

  return db.model('User', schema, 'users');
};