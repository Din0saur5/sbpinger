const express = require("express");
const fetch = require("node-fetch");
const cron = require("node-cron");
const cronParser = require("cron-parser"); // Install this: npm install cron-parser
require("dotenv").config();

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const headers = {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
};

// Variables to track next schedule
let latestPost = "Fetching latest post...";
let nextScheduledTime = calculateNextRun("0 12 * * *"); // Set to run at noon

// Function to calculate the next cron job run time
function calculateNextRun(cronExpression) {
    const now = new Date();
    const interval = cronParser.parseExpression(cronExpression, { currentDate: now });
    return interval.next().toString();
}

// Function to fetch the latest post from the database
const fetchLatestPost = async () => {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/pings?order=created_at.desc&limit=1`, {
            method: "GET",
            headers: headers,
        });

        if (response.ok) {
            const data = await response.json();
            if (data.length > 0) {
                latestPost = `Posted at: ${new Date(data[0].created_at).toLocaleString()}`;
            } else {
                latestPost = "No posts found in the database.";
            }
        } else {
            console.error("Failed to fetch latest post:", await response.text());
            latestPost = "Error fetching latest post.";
        }
    } catch (error) {
        console.error("Error during fetch latest post:", error);
        latestPost = "Error fetching latest post.";
    }
};

// Function to send a POST request to the "pings" table
const sendPostRequest = async () => {
    const payload = { pinged: true };

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/pings`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            console.log("POST request successful:");
            // Fetch the latest post after a successful POST
            await fetchLatestPost();
        } else {
            console.error("POST request failed:", await response.text());
        }
    } catch (error) {
        console.error("Error during POST request:", error);
    }
};

// Schedule the POST request to run once a day at noon
cron.schedule("0 12 * * *", () => {
    console.log("Executing daily POST request");
    sendPostRequest();
});

// Fetch the latest post on server start
fetchLatestPost();

// Set up Express server
const app = express();
const PORT = process.env.PORT || 3000;

// Serve a dynamic webpage with the latest POST result and next scheduled time
app.get("/", async (req, res) => {
    const html = `
        <html>
            <head>
                <title>Daily POST Scheduler</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; margin-top: 20%; }
                    h1 { color: #333; }
                    button { font-size: 16px; padding: 10px 20px; cursor: pointer; margin-top: 20px; }
                </style>
            </head>
            <body>
                <h1>Daily POST Scheduler</h1>
                <p><strong>Latest POST:</strong> ${latestPost}</p>
                <p><strong>Next Scheduled POST:</strong> ${nextScheduledTime}</p>
                <button id="pingButton">Ping Now</button>
                <script>
                    // Function to send POST request to the server when the button is clicked
                    document.getElementById("pingButton").addEventListener("click", async () => {
                        const response = await fetch("/ping-now", { method: "POST" });
                        if (response.ok) {
                            // Reload the page to reflect the new data
                            window.location.reload();
                        } else {
                            alert("Failed to ping now.");
                        }
                    });
                </script>
            </body>
        </html>
    `;
    res.send(html);
});

// Create a new endpoint to handle the "Ping Now" button click
app.post("/ping-now", async (req, res) => {
    await sendPostRequest();  // Trigger the POST request function
    res.status(201).send("Ping request sent successfully.");
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
