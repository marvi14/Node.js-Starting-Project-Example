var express = require('express');
var wagner = require('wagner-core');
var cookieParser = require('cookie-parser');
var flash = require('connect-flash');

require('./dependencies')(wagner);
require('./models/models')(wagner);

var app = express();
app.use(cookieParser());
app.use(flash());

app.use(function(req, res, next) {
    res.append('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.append('Access-Control-Allow-Credentials', true);
    res.append('Access-Control-Allow-Methods', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
    res.append('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

wagner.invoke(require('./api/auth'), { app: app });

app.use('/api/v1', require('./api/products_api')(wagner));
app.use('/api/v1', require('./api/category_api')(wagner));
app.use('/api/v1', require('./api/cart_api')(wagner));
app.use('/api/v1', require('./api/paypal_api')(wagner));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get(/^(.+)$/, function (req, res) {
    res.sendFile(__dirname + req.params[0]);
});

app.listen(3000);
console.log('Listening on port 3000!');