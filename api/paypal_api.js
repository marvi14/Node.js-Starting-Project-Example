var bodyparser = require('body-parser');
var express = require('express');
var status = require('http-status');
var _ = require('underscore');
var paypal = require('paypal-rest-sdk');

module.exports = function (wagner) {
    var api = express.Router();
    api.use(bodyparser.json());
    wagner.invoke(function (Config) {
        paypal.configure(Config.payPalApi);
    });

    api.post('/createPayPalTransaction', wagner.invoke(function (Config) {
        return function (req, res) {
            //ESTO DEBERIA SER UN POST QUE RECIBA UNA LISTA DE ID'S DE PRODUCTOS PARA CALCULAR EL TOTAL
            var total = getTotal(req.body.services);
            var payment = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": Config.payPalApi.return_url,
                    "cancel_url": Config.payPalApi.cancel_url
                },
                "transactions": [
                    {
                        "amount": {
                            "total": total,
                            "currency": "USD"
                        },
                        "description": "PayPal Payment!"
                    }
                ]
            };

            paypal.payment.create(payment, function (error, payment) {
                if (error) {
                    console.log(error);
                } else {
                    var redirectUrl;
                    for (var i = 0; i < payment.links.length; i++) {
                        var link = payment.links[i];
                        if (link.method === 'REDIRECT') {
                            redirectUrl = link.href;
                        }
                    }
                    return res.redirect(redirectUrl);
                }
            });
        };
    }));

    api.get('/paypal/executePayPalTransaction', wagner.invoke(function () {
        return function (req, res) {
            var paymentId = req.param('paymentId');
            var details = {"payer_id": req.param('PayerID')};
            paypal.payment.execute(paymentId, details, function (error, payment) {
                if (error) {
                    console.log(error.response);
                    throw error;
                } else {
                    return res.json({'success': true, 'payment': payment})
                }
            });
        };
    }));

    api.get('/paypal/cancelPayPalTransaction', wagner.invoke(function () {
        return function (req, res) {
            return res.json({'error': 'User cancel PayPal payment'});
        };
    }));

    return api;
};

function getTotal(services) {
    var total = 0;
    _.each(services, function (service) {
        total += service.price;
    });
    return total;
}
