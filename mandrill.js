var mandrill = require('node-mandrill')('4U3134NeBG45QYxaJKyGkA');

module.exports = function () {
    var instance = {};
    instance.sendEmail = function (emails, from, subject, body) {
        //send an e-mail to jim rubenstein
        mandrill('/messages/send', {
            message: {
                to: [{email: 'msanandrea@gmail.com', name: 'Mariano San Andrea'}],
                from_email: 'mariano@cococlub.uy',
                subject: "Hey, what's up?",
                text: "Hello, I sent this message using mandrill in Node.Js!!!! :)"
                // to: emails,
                // from_email: from,
                // subject: subject,
                // text: body
            }
        }, function (error, response) {
            //uh oh, there was an error
            if (error)
                console.log(JSON.stringify(error));
            //everything's good, lets see what mandrill said
            else
                console.log(response);
        });
    };
    return instance;
};