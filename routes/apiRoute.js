var dotenv = require('dotenv')
dotenv.config();
var express = require('express');
const router = express.Router();
var cryptoJs = require('crypto-js');
const jwt = require('jsonwebtoken');

const auth = require('./authRoute')
var { db } = require('../Database/Connection');
const apiKeyCheck = require('./apiKeyRoute')

const generateaccount = (req) => {
    const currentTime = new Date();
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    const seconds = currentTime.getSeconds().toString().padStart(2, '0');
    const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(5, '0');

    return `${hours}${minutes}${seconds}${randomDigits}`;
}

function generateNumberRange(startingNumber, range) {
    const result = []

    for (let i = 0; i < range; i++) {
        result.push(startingNumber - i);
    }

    return result;
}


router.post('/signup', async (req, res) => {
    try {
        const user_id = generateaccount(req);
        const table = process.env.SQL_USER_TABLE;

        const userData = {
            email: req.body.email,
            username: req.body.username,
            password: cryptoJs.AES.encrypt(req.body.password, process.env.CRYPTO_KEY).toString(),
            user_id: user_id
        }

        var query = `INSERT INTO ${table} SET ?`;
        // var state = `INSERT INTO ${process.env.SQL_ACCOUNT_TABLE} SET ?`;

        // db.query(state, userAccountData, (error, result) => {
        //     if (error) throw error;
        // })

        db.query(query, userData, async (error, results) => {
            if (error) throw error;

            res.status(200).json({
                'user_id': user_id,
                'status': "Account successfully created",
            })
        });

    } catch (err) {
        console.log(err);
        res.status(401).send('Error while saving data');
    }
})


router.post('/login', async (req, res) => {
    try {
        const table = process.env.SQL_USER_TABLE

        var query = `SELECT * from ${table} WHERE (username='${req.body.username}')`;

        db.query(query, async (error, user) => {
            if (error) throw error;
            else if (user.length === 0) {
                console.log('No data found');
                res.status(401).json({
                    'status': 'Incorrect username/password provided. Please retry'
                });
            }
            else {
                const temp = cryptoJs.AES.decrypt(user[0].password, process.env.CRYPTO_KEY);
                const password = temp.toString(cryptoJs.enc.Utf8);

                if (password === req.body.password) {
                    const token = jwt.sign({ username: user[0].username }, process.env.JWT_KEY, {
                        expiresIn: "10 minutes"
                    })

                    res.cookie('jwt', token, {
                        expires: new Date(Date.now() + 600000),
                        httpOnly: true
                    })

                    res.status(200).json({
                        'user_id': user[0].user_id
                    })
                }
                else
                    res.status(401).send('Incorrect username/password provided. Please retry');
            }
        })
    } catch (err) {
        console.log(err);
        res.status(401).send('Incorrect username/password provided. Please retry');
    }
})


router.post('/trains/create', apiKeyCheck, async (req, res) => {
    try {
        const train_id = generateaccount(req);
        const table = process.env.SQL_TRAIN_TABLE;

        const trainData = {
            train_id: train_id,
            train_name: req.body.train_name,
            train_source: req.body.source,
            train_destination: req.body.destination,
            seat_capacity: req.body.seat_capacity,
            arrival_time_at_source: req.body.arrival_time_at_source,
            arrival_time_at_destination: req.body.arrival_time_at_destination,
            available_seats: req.body.seat_capacity
        }

        var query = `INSERT INTO ${table} SET ?`;

        db.query(query, trainData, async (error, results) => {
            if (error) throw error;

            res.status(200).json({
                "message": "Train added successfully",
                "train_id": train_id
            })
        });

    } catch (err) {
        console.log(err);
        res.status(401).send('error in trains/create');
    }
})


router.get('/trains/availability', async (req, res) => {
    try {
        const table = process.env.SQL_TRAIN_TABLE;
        const source = req.query.source
        const destination = req.query.destination

        var query = `select train_id, train_name, available_seats from ${table} where (train_source = '${source}' and train_destination = '${destination}')`;
        var resData = []

        db.query(query, async (error, train) => {
            if (error) throw error;
            else if (train.length === 0) {
                console.log('No data found');
                res.status(401).json('no data found');
            }
            else {
                for (const item in train) {
                    resData.push({
                        train_id: item.train_id,
                        train_name: item.train_name,
                        available_seats: item.available_seats
                    })
                }

                res.status(200).json(train)
            }
        })
    } catch (err) {
        console.log(err);
        res.status(401).send('error in trains/availability');
    }
})


router.post('/trains/:train_id/book', auth, async (req, res) => {
    try {
        const train_id = req.params.train_id
        const book_table = process.env.SQL_TRAIN_BOOK_TABLE;
        const train_table = process.env.SQL_TRAIN_TABLE;


        var query = `select * from ${train_table} where train_id = '${train_id}'`;

        db.query(query, async (error, trains) => {
            if (error) throw error;

            if (trains.length == 0) {
                res.status(404).json('No data found')
            }

            const train = trains[0]
            const book_id = generateaccount()

            if (train.available_seats >= req.body.no_of_seats) {
                const seats = generateNumberRange(train.available_seats, req.body.no_of_seats)

                console.log(seats.toString())

                const bookData = {
                    booking_id: book_id,
                    train_id: train.train_id,
                    train_name: train.train_name,
                    user_id: req.body.user_id,
                    no_of_seats: req.body.no_of_seats,
                    seat_numbers: `[${seats.toString()}]`,
                    arrival_time_at_source: train.arrival_time_at_source,
                    arrival_time_at_destination: train.arrival_time_at_destination
                }

                console.log(bookData)

                query = `INSERT INTO ${book_table} SET ?`;
                var available_seats = train.available_seats - req.body.no_of_seats

                db.query(query, bookData, async (error, result) => {
                    if (error) throw error;

                    query = `UPDATE ${train_table} SET available_seats = ${available_seats} where train_id = ${train.train_id}`

                    db.query(query, async (error, results) => {
                        if (error) throw error;
                        
                        res.status(200).json({
                            "message": "Seat booked successfully",
                            "booking_id": result.booking_id,
                            "seat_numbers": seats
                        })
                    })
                });

            } else {
                res.status(404).json('No Seats Available')
            }
        });

    } catch (err) {
        console.log(err);
        res.status(401).send('error in trains/create');
    }
})


router.get('/bookings/:booking_id', auth, async (req, res) => {
    try {
        const book_table = process.env.SQL_TRAIN_BOOK_TABLE;
        const book_id = req.params.booking_id

        var query = `select * from ${book_table} where booking_id = '${book_id}'`

        db.query(query, async (error, book) => {
            if (error) throw error;
            else if (book.length === 0) {
                console.log('No data found');
                res.status(401).json('no data found');
            }
            else {
                res.status(200).json(book)
            }
        })

        
    } catch (err) {
        console.log(err);
        res.status(401).send('error in trains/availability');
    }
})




module.exports = router