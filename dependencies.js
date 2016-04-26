var fs = require('fs');
var fx = require('./utils/fx');
var Stripe = require('stripe');
var sendgrid = require('./utils/sendgrid');
var os = require('os');

module.exports = function (wagner) {

    // TODO: Make Stripe depend on the Config service and use its `stripeKey`
    // property to get the Stripe API key.
    wagner.factory('Stripe', function () {
        return Stripe(Config.stripeKey);
    });

    wagner.factory('fx', fx);
    wagner.factory('Sendgrid', sendgrid);

    wagner.factory('Config', function () {
        if (os.hostname().indexOf("local") > -1)
            return JSON.parse(fs.readFileSync('./utils/config.json').toString());
        else
            return JSON.parse(fs.readFileSync('./utils/config_prod.json').toString());
    });

    var Config = wagner.invoke(function (Config) {
        return Config;
    });
};
