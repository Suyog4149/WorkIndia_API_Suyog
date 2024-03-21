require("dotenv").config();
var express = require("express");
const app = express();
var cookieParser = require("cookie-parser");

app.use(cookieParser());

const apiKeyCheck = (req, res, next) => {
    try{
        const providedApiKey = req.headers['api-key'];
        if (providedApiKey && providedApiKey === process.env.APIKEY) {
            next();
        } else {
            res.status(401).json({ error: 'Unauthorized' });
        }    
    }catch(err){
        console.log(err);
        res.status(401).send('sign in again...');
    }
}

module.exports = apiKeyCheck