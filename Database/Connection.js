var dotenv = require('dotenv');
dotenv.config();
var mysql = require('mysql');

var db = mysql.createConnection({
    host: 'localhost',
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB
});

const Connection = (() => {
    db.connect((err) => {
        if(err)
            console.log(err);
        else    
            console.log('DataBase Connection Successful!');
    })
})

module.exports = { Connection, db}