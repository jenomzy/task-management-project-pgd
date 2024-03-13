// ./config/passport-config.js

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose')
var User = mongoose.model('User')
var bcrypt = require('bcrypt')

var authenticateUser = async (username, password, done) => {
    User.findOne({ username: username }).then((user) => {
        if (!user) 
            return done(null, false, { message: 'No user with that email'})
        if(bcrypt.compareSync(password,user.password))
            return done(null, user)
        else
            return done(null, false,{ message: 'wrong password' });
    }).catch((err) => {   
        done(err);
        console.log("Authentication error,  Contact admin", err);
    });
}

var strategy  = new LocalStrategy(authenticateUser);

passport.use(strategy);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((userId, done) => {
    User.findById(userId)
        .then((user) => {
            done(null, user);
        })
        .catch(err => done(err))
});