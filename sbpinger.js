const fetch = require("node-fetch");
const cron = require("node-cron");

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const headers = {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
};

// Function to send a POST request to the "pings" table
const sendPostRequest = async () => {
    const payload = {
        pinged: true,
    };

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/pings`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            console.log("POST request successful.");
        } else {
            console.error("POST request failed:", await response.text());
        }
    } catch (error) {
        console.error("Error during POST request:", error);
    }
};

// Function to send a FETCH request to retrieve data with ID = 1
const sendFetchRequest = async () => {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/pings?id=eq.1`, {
            method: "GET",
            headers,
        });

        if (response.ok) {
            const data = await response.json();
            console.log("FETCH request successful:", data);
        } else {
            console.error("FETCH request failed:", await response.text());
        }
    } catch (error) {
        console.error("Error during FETCH request:", error);
    }
};

// Schedule the POST request to run twice a week
cron.schedule("0 0 * * 1,4", () => {
    console.log("Executing POST request (twice a week)");
    sendPostRequest();
});

// Schedule the FETCH request to run once a day
cron.schedule("0 0 * * *", () => {
    console.log("Executing FETCH request (once a day)");
    sendFetchRequest();
});

console.log("Scheduled tasks initialized.");
