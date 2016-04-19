var fs = require('fs');
var fx = require('./fx');
var Stripe = require('stripe');
var mandrill =  require('./mandrill');

module.exports = function(wagner) {

    // TODO: Make Stripe depend on the Config service and use its `stripeKey`
    // property to get the Stripe API key.
    wagner.factory('Stripe', function() {
        return Stripe(Config.stripeKey);
    });

    wagner.factory('fx', fx);
    wagner.factory('Mandrill', mandrill);

    wagner.factory('Config', function() {
        return JSON.parse(fs.readFileSync('./config.json').toString());
    });

    var Config = wagner.invoke(function(Config) {
        return Config;
    });
};
