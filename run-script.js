require('dotenv').config({ path: __dirname + '/.env' });
const massive = require('massive');

massive(process.env.DB_CONNECTION_STRING, { scripts: __dirname + '/db' })
    .then(db => {
        return db.query('select * from "Users"');
    })
    .then(users => {
        console.log(users);
    })
    .catch(err => {
        console.warn(err);
    });
