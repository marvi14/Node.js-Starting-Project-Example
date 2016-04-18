// TODO: make setupAuth depend on the Config service...
function setupAuth(User, app, Config) {
  var passport = require('passport');
  var FacebookStrategy = require('passport-facebook').Strategy;
  var LocalStrategy = require('passport-local').Strategy;

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
  passport.use(new FacebookStrategy(
    {
      // TODO: and use the Config service here
      clientID: Config.facebookClientId,
      clientSecret: Config.facebookClientSecret,
      callbackURL: 'http://localhost:3000/auth/facebook/callback',
      // Necessary for new version of Facebook graph API
      profileFields: ['id', 'emails', 'name', 'gender', 'displayName']
    },
    function (accessToken, refreshToken, profile, done) {
      if (!profile.emails || !profile.emails.length) {
        return done(null, false, 'No emails associated with this account!');
      }

      User.findOneAndUpdate(
        { 'data.oauth': profile.id },
        {
          $set: {
            'profile.username': profile.emails[0].value,
            'profile.picture': 'http://graph.facebook.com/' +
            profile.id.toString() + '/picture?type=large'
          }
        },
        { 'new': true, upsert: true, runValidators: true },
        function (error, user) {
          done(error, user, 'Facebook login succeded');
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
    if (req.url.indexOf("/auth/facebook") > -1 || req.url.indexOf("/signup") > -1 || req.url.indexOf("/login") > -1 || req.session.user)
      next();
    else if (req.session.user == undefined) {
      return res.json({ title: 'Hello - Please Login To Your Account' });
    }
  });

  // Express routes for auth
  app.get('/auth/facebook',
    passport.authenticate('facebook', { scope: ['email', 'user_birthday', 'user_likes'] })
  );

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
        return res.status(200).send({ success: true, message: info, user: user });
      });
    })(req, res, next);
  });

  app.get('/signup', function (req, res, next) {
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
        return res.status(200).send({ success: true, message: info, user: user });
      });
    })(req, res, next);
  });

  app.get('/login', function (req, res, next) {
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
        return res.status(200).send({ success: true, message: info, user: user });
      });
    })(req, res, next);
  });
}
module.exports = setupAuth;