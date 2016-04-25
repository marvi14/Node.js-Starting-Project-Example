// TODO: make setupAuth depend on the Config service...
function setupAuth(User, app, Config, Sendgrid) {
    var passport = require('passport');
    var FacebookStrategy = require('passport-facebook').Strategy;
    var LocalStrategy = require('passport-local').Strategy;
    var TwitterStrategy = require('passport-twitter').Strategy;
    var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
    var jwt = require('jsonwebtoken');
    var tokenExpiration = 24 * 60 * 60;

    // High level serialize/de-serialize configuration for passport
    passport.serializeUser(function (user, done) {
        done(null, user._id);
    });

    passport.deserializeUser(function (id, done) {
        User.
            findOne({ _id: id }).
            exec(done);
    });

    // Facebook-specific
    passport.use(new FacebookStrategy({
        // TODO: and use the Config service here
        clientID: Config.facebookClientId,
        clientSecret: Config.facebookClientSecret,
        callbackURL: Config.facebookCallbackURL,
        // Necessary for new version of Facebook graph API
        profileFields: ['id', 'emails', 'name', 'gender', 'displayName']
    },
        function (accessToken, refreshToken, profile, done) {
            if (!profile.emails || !profile.emails.length) {
                return done(null, null, 'No emails associated with this Facebook account!');
            }

            User.findOneAndUpdate({ 'data.oauth': profile.id }, {
                $set: {
                    'profile.username': profile.emails[0].value,
                    'profile.picture': 'http://graph.facebook.com/' +
                    profile.id.toString() + '/picture?type=large'
                }
            }, { 'new': true, upsert: true, runValidators: true },
                function (error, user) {
                    done(error, user, 'Facebook login succeded');
                });
        }));

    passport.use(new TwitterStrategy({

        consumerKey: Config.twitterConsumerKey,
        consumerSecret: Config.twitterConsumerSecret,
        callbackURL: Config.twitterCallbackURL,
        userProfileURL: "https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true"


    },
        function (token, tokenSecret, profile, done) {

            // make the code asynchronous
            // User.findOne won't fire until we have all our data back from Twitter
            process.nextTick(function () {

                User.findOne({ 'data.oauth': profile.id }, function (err, user) {

                    // if there is an error, stop everything and return that
                    // ie an error connecting to the database
                    if (err)
                        return done(err, null, 'An error ocurred trying to connect with Twitter');

                    // if the user is found then log them in
                    if (user) {
                        return done(null, user, 'Twitter user logged!'); // user found, return that user
                    } else {
                        // if there is no user, create them
                        var newUser = new User();

                        // set all of the user data that we need
                        //newUser.profile.username = profile.emails[0].value;
                        newUser.profile.username = profile.username;
                        newUser.profile.picture = profile.photos[0].value.replace('_normal', '');
                        newUser.data.oauth = profile.id;

                        // save our user into the database
                        newUser.save(function (err) {
                            if (err)
                                return done(err, null, 'Twitter user can not be created!');
                            return done(null, newUser, "Twitter user created!");
                        });
                    }
                });

            });

        }));

    passport.use(new GoogleStrategy({
        clientID: Config.googleClientId,
        clientSecret: Config.googleClientSecret,
        callbackURL: Config.googleCallbackURL
    },
        function (token, refreshToken, profile, done) {

            // make the code asynchronous
            // User.findOne won't fire until we have all our data back from Google
            process.nextTick(function () {

                // try to find the user based on their google id
                User.findOne({ 'data.oauth': profile.id }, function (err, user) {
                    if (err)
                        return done(err, null, 'An error ocurred trying to connect with Google');

                    if (user) {

                        // if a user is found, log them in
                        return done(null, user, 'Google user logged!');
                    } else {
                        // if the user isnt in our database, create a new user
                        var newUser = new User();

                        // set all of the relevant information
                        newUser.profile.username = profile.emails[0].value;
                        newUser.data.oauth = profile.id;
                        newUser.profile.picture = profile._json['picture'];

                        // save the user
                        newUser.save(function (err) {
                            if (err)
                                return done(err, null, 'Google user can not be created!');
                            return done(null, newUser, 'Google user created!');
                        });
                    }
                });
            });

        }));


    // Local-specific
    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
        function (req, email, password, done) {
            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists

            // User.findOne won't fire until we have all our data back from Twitter
            process.nextTick(function () {
                User.findOne({ 'profile.username': email }, function (err, user) {
                    // if there are any errors, return the error
                    if (err)
                        return done(err);

                    // check to see if theres already a user with that email
                    if (user) {
                        return done(null, false, 'That email is already taken.');
                    } else {

                        // if there is no user with that email
                        // create the user
                        var newUser = new User();

                        // set the user's local credentials
                        newUser.profile.username = email;
                        newUser.profile.password = newUser.generateHash(password);

                        // save the user
                        newUser.save(function (err) {
                            if (err)
                                throw err;
                            return done(null, newUser, 'User created successfully');
                        });
                    }

                });
            });
        }));

    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
        function (req, email, password, done) { // callback with email and password from our form

            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
            User.findOne({ 'profile.username': email }, function (err, user) {
                // if there are any errors, return the error before anything else
                if (err)
                    return done(err);

                // if no user is found, return the message
                if (!user)
                    return done(null, false, 'No user found.'); // req.flash is the way to set flashdata using connect-flash

                // if the user is found but the password is wrong
                if (!user.validPassword(password))
                    return done(null, false, 'Oops! Wrong password.'); // create the loginMessage and save it to session as flashdata

                // all is well, return successful user
                return done(null, user, 'Login Succeded');
            });

        }));

    // Express middlewares
    app.use(require('express-session')({
        secret: 'this is a secret'
    }));
    app.use(passport.initialize());
    app.use(passport.session());

    // MIDDLEWARE QUE VERIFICA QUE EL USUARIO ESTE LOGUEADO EN CADA REQUEST A LA API
    app.use(function (req, res, next) {
        if (req.url.indexOf("/auth") > -1 || req.url.indexOf("/paypal") > -1 ||req.user) {
            next();
        }
        else if (req.user == undefined) {
            //PUEDE NO ESTAR LOGUEADO EN LA WEB PERO SE UN PEDIDO A LA API DE LAS APPS

            // check header or url parameters or post parameters for token
            var token = null;
            if (req.query)
                token = req.query.token;
            if (!token && req.headers)
                token = req.headers['x-access-token'];
            if (!token && req.body)
                token = req.body.token;

            // decode token
            if (token) {

                // verifies secret and checks exp
                jwt.verify(token, Config.tokenSecret, function (err, decoded) {
                    if (err) {
                        return res.json({ success: false, message: 'Failed to authenticate token.' });
                    } else {
                        // if everything is good, save to request for use in other routes
                        req.decoded = decoded;
                        next();
                    }
                });
            } else {

                // if there is no token return an error
                return res.status(403).send({
                    success: false,
                    message: 'No token provided.'
                });

            }
        }
    });

    // Express routes for auth
    app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'user_birthday', 'user_likes'] }));

    app.get('/auth/facebook/callback', function (req, res, next) {
        passport.authenticate('facebook', function (err, user, info) {
            if (err) {
                return next(err); // will generate a 500 error
            }
            // Generate a JSON response reflecting authentication status
            if (!user) {
                return res.status(500).send({ success: false, message: info });
            }
            req.login(user, function (err) {
                if (err) {
                    return next(err);
                }
                var token = jwt.sign(user, Config.tokenSecret, {
                    expiresIn: tokenExpiration// expires in 24 hours
                });
                return res.status(200).send({ success: true, message: info, user: user, token: token });
            });
        })(req, res, next);
    });

    app.get('/auth/twitter', passport.authenticate('twitter'));

    app.get('/auth/twitter/callback', function (req, res, next) {
        passport.authenticate('twitter', function (err, user, info) {
            if (err) {
                return next(err); // will generate a 500 error
            }
            // Generate a JSON response reflecting authentication status
            if (!user) {
                return res.status(500).send({ success: false, message: info });
            }
            req.login(user, function (err) {
                if (err) {
                    return next(err);
                }
                var token = jwt.sign(user, Config.tokenSecret, {
                    expiresIn: tokenExpiration// expires in 24 hours
                });
                return res.status(200).send({ success: true, message: info, user: user, token: token });
            });
        })(req, res, next);
    });

    app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

    app.get('/auth/google/callback', function (req, res, next) {
        passport.authenticate('google', function (err, user, info) {
            if (err) {
                return next(err); // will generate a 500 error
            }
            // Generate a JSON response reflecting authentication status
            if (!user) {
                return res.status(500).send({ success: false, message: info });
            }
            req.login(user, function (err) {
                if (err) {
                    return next(err);
                }
                var token = jwt.sign(user, Config.tokenSecret, {
                    expiresIn: tokenExpiration// expires in 24 hours
                });
                return res.status(200).send({ success: true, message: info, user: user, token: token });
            });
        })(req, res, next);
    });


    app.get('/auth/signup', function (req, res, next) {
        passport.authenticate('local-signup', function (err, user, info) {
            if (err) {
                return next(err); // will generate a 500 error
            }
            // Generate a JSON response reflecting authentication status
            if (!user) {
                return res.status(500).send({ success: false, message: info });
            }
            req.login(user, function (err) {
                if (err) {
                    return next(err);
                }
                var token = jwt.sign(user, Config.tokenSecret, {
                    expiresIn: tokenExpiration// expires in 24 hours
                });
                return res.status(200).send({ success: true, message: info, user: user, token: token });
            });
        })(req, res, next);
    });

    app.get('/auth/login', function (req, res, next) {
        passport.authenticate('local-login', function (err, user, info) {
            if (err) {
                return next(err); // will generate a 500 error
            }
            // Generate a JSON response reflecting authentication status
            if (!user) {
                return res.status(500).send({ success: false, message: info });
            }
            req.login(user, function (err) {
                if (err) {
                    return next(err);
                }
                var token = jwt.sign(user, Config.tokenSecret, {
                    expiresIn: tokenExpiration// expires in 24 hours
                });
                return res.status(200).send({ success: true, message: info, user: user, token: token });
            });
        })(req, res, next);
    });
}
module.exports = setupAuth;
