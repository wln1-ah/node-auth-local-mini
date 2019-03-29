require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const session = require('express-session');

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const massive = require('massive');
const bcrypt = require('bcrypt');

const app = express();

massive(process.env.DB_CONNECTION_STRING, { scripts: __dirname + '/db' })
    .then(db => {
        console.log('Connected to the DB');
        app.set('db', db);
    })
    .catch(err => {
        console.warn(err);
    });

passport.use('login', new LocalStrategy({
    usernameField: 'email',
}, (email, password, done) => {
    if (!email || !password) {
        return done({ message: 'Email and password are required' });
    }

    const db = app.get('db');

    // same as -> SELECT * FROM "Users" WHERE email = ${email}
    db.Users.find({ email })
        .then(userResults => {
            if (userResults.length == 0) {
                return done(JSON.stringify({ message: 'Username or password is invalid' }));
            }

            const user = userResults[0];

            const storedPassword = user.password;

            if (!bcrypt.compareSync(password, storedPassword)) {
                return done(JSON.stringify({ message: 'Username or password is invalid' }));
            }

            delete user.password;

            done(null, user);
        })
        .catch(err => {
            console.warn(err);
            done(JSON.stringify({ message: 'Unknown error occurred.  Please try again.' }));
        });
}));

passport.use('register', new LocalStrategy({
    usernameField: 'email',
}, (email, password, done) => {
    const db = app.get('db');

    // same as -> SELECT * FROM "Users" WHERE email = ${email}
    db.Users.find({ email })
        .then(userResults => {
            if (userResults.length > 0) {
                return done(JSON.stringify({ message: 'Username is already in use' }));
            }

            const hashedPassword = bcrypt.hashSync(password, 15);

            return db.Users.insert({
                email,
                password: hashedPassword,
            });
        })
        .then(user => {
            done(null, user);
        })
        .catch(err => {
            console.warn(err);
            done(JSON.stringify({ message: 'Unknown error occurred.  Please try again.' }));
        });
}));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    const db = app.get('db');

    db.Users.find(id)
        .then(user => {
            if (!user) {
                return done('No user found with id ' + id);
            }

            done(null, user);
        })
        .err(err => {
            console.warn(err);
            done('Problem authenticating request');
        });
});

app.use(express.json());
app.use(session({
    saveUninitialized: false,
    resave: false,
    secret: process.env.SESSION_SECRET,
}));
app.use(passport.initialize());
app.use(passport.session());

app.post('/auth/login', passport.authenticate('login'), (req, res) => {
    return res.send({ message: 'CONGRATS!!!' });
});

app.post('/auth/register', passport.authenticate('register'), (req, res) => {
    return res.send({ message: 'Thanks for registering!' });
});

const port = 3000;
app.listen( port, () => { console.log(`Server listening on port ${port}`); } );