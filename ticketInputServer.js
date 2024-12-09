const express = require("express");
const ejs = require("ejs");
const axios = require('axios');
const path = require("path");
const bodyParser = require("body-parser");
require("dotenv").config({ path: path.resolve(__dirname, '.env') });
const app = express();
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

const uri = process.env.MONGO_CONNECTION_STRING;
const databaseAndCollection = { db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION };

const { MongoClient } = require('mongodb');

if (process.argv.length != 3) {
    process.exit(0);
}

let prompt = "Type 'stop' to shutdown the server: ";
let exitMessage = "Shutting down the server";
let portNumber = process.argv[2];

console.log(`Web server started and running at http://localhost:${portNumber}`);

process.stdout.write(prompt);
process.stdin.on("readable", function () {
    let input = process.stdin.read();
    if (input !== null) {
        let command = String(input).trim();
        if (command == "stop") {
            process.stdout.write(exitMessage);
            process.exit(0);
        }
        process.stdout.write(prompt);
        process.stdin.resume();
    }
});

// ENDPOINTS
app.use(bodyParser.urlencoded({extended:false}));

app.get("/", (request, response) => {
    response.render("ticketInput", { portNumber: portNumber });
});

app.post("/ticketInput", async (request, response) => {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const { name, age, gender, numTravelers, startDate, endDate, cities, airport, additionalInfo } = request.body;

        let passenger = { name, age, gender, numTravelers, startDate, endDate, cities, airport, additionalInfo };
        await addPassenger(client, databaseAndCollection, passenger);

        response.render("ticketConfirmation", {name, age, gender, numTravelers, startDate, endDate, cities, airport, additionalInfo});
    } catch (error) {
        console.error(error);
    } finally {
        await client.close();
    }
});

async function addPassenger(client, databaseAndCollection, newPassenger) {
    await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newPassenger);
}

// Base URL and API Key
const BASE_URL = 'http://api.weatherstack.com/current';
const API_KEY = 'e8a0e48d2cc3e81e6de24b0edcb6a837'; // Replace with your actual API key

// Allowed cities list
const allowedCities = [
    "Austin",
    "Atlanta",
    "Boston",
    "Chicago",
    "Detroit",
    "Las Vegas",
    "Los Angeles",
    "Miami",
    "New York",
    "Pheonix",
    "San Francisco",
    "Seattle",
    "Washington D.C."
];

app.get('/weather', async (req, res) => {
    // Retrieve the selected city from the query string
    const query = req.query.query;

    // Check if the city is provided
    if (!query) {
        return res.status(400).json({
            error: "No city selected. Please select a city from the list."
        });
    }

    // Check if the city is in the allowed list
    if (!allowedCities.includes(query)) {
        return res.status(400).json({
            error: `City '${query}' is not in the allowed list. Please select a valid city.`
        });
    }

    try {
        // Construct the full API URL
        const apiUrl = `${BASE_URL}?access_key=${API_KEY}&query=${query}`;
        console.log('API Request:', apiUrl); // For debugging

        // Fetch weather data
        const response = await axios.get(apiUrl);

        // Check for errors in API response
        if (response.data.error) {
            console.error('API Error:', response.data.error);
            return res.status(400).json(response.data.error);
        }

        // Send the weather data back to the client
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching weather data:', error.message);
        res.status(500).json({ error: 'Failed to fetch weather data.' });
    }
});

app.listen(portNumber);
