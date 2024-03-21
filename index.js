var dotenv = require('dotenv')
dotenv.config();
var express = require('express')
const app=express();
var cors = require('cors')

const apiRoute = require('./routes/apiRoute')
const {Connection} = require('./Database/Connection')

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: false}));

Connection();

app.get('/', async(req, res)=> {
    res.send("Hello from Admin");
})

app.use('/api', apiRoute)


app.listen(process.env.PORT, () => {
    console.log(`Listening on port ${process.env.PORT}`);
})