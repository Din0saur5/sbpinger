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
let nextScheduledTime = calculateNextRun("0 0 * * *");

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
            const data = await response.json();
            console.log("POST request successful:", data);
            // Fetch the latest post after a successful POST
            await fetchLatestPost();
            nextScheduledTime = calculateNextRun("0 0 * * *");
        } else {
            console.error("POST request failed:", await response.text());
        }
    } catch (error) {
        console.error("Error during POST request:", error);
    }
};

// Schedule the POST request to run once a day at midnight
cron.schedule("0 0 * * *", () => {
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
                </style>
            </head>
            <body>
                <h1>Daily POST Scheduler</h1>
                <p><strong>Latest POST:</strong> ${latestPost}</p>
                <p><strong>Next Scheduled POST:</strong> ${nextScheduledTime}</p>
                <script>
                    setInterval(() => {
                        window.location.reload();
                    }, 60000); // Reload every minute to keep the display updated
                </script>
            </body>
        </html>
    `;
    res.send(html);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
