var sendgrid = require('sendgrid')('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');

module.exports = function () {
    var instance = {};
    instance.sendEmail = function (emails, from, subject, body) {
        //send an e-mail to jim rubenstein
        sendgrid.send({
            to: ['msanandrea@gmail.com'],
            from: 'mariano@cococlub.uy',
            subject: "Hey, what's up?",
            html: "Hello, I sent this message using mandrill in Node.Js!!!! :)"
            // to: emails,
            // from: from,
            // subject: subject,
            // html: body
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