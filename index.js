var express = require('express');
var wagner = require('wagner-core');
var cookieParser = require('cookie-parser');
var flash    = require('connect-flash');

require('./models')(wagner);
require('./dependencies')(wagner);

var app = express();
app.use(cookieParser());
app.use(flash()); 

app.use(function (req, res, next) {
    res.append('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.append('Access-Control-Allow-Credentials', true);
    res.append('Access-Control-Allow-Methods', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
    res.append('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

wagner.invoke(require('./auth'), { app: app });

app.use('/api/v1', require('./api')(wagner));

app.listen(3000);
console.log('Listening on port 3000!');