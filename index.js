'use strict';

const line = require('@line/bot-sdk');
const express = require('express');
const mongoose = require('mongoose');

// create LINE SDK config from env variables
const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

const mongo_url = "mongodb://heroku_nsrr99d4:6ef3isk494afbp9ec1mj6u18ki@ds133556.mlab.com:33556/heroku_nsrr99d4"

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
        res.sendStatus(200);

        let events_processed = [];
        req.body.events.forEach(async (event) => {
            if (event.type == "message" && event.message.type == "text"){
                if (event.message.text == "こんにちは"){
                    const profile = await client.getProfile(event.source.userId);
                    console.log(profile);
                    events_processed.push(client.replyMessage(event.replyToken, {
                        type: "text",
                        text: "こんにちは"
                    }));
                }
            }
            if (event.type == "image"){
                if (event.message.text == "こんにちは"){
                    events_processed.push(client.replyMessage(event.replyToken, {
                        type: "text",
                        text: "こんにちは"
                    }));
                }
            }
        });
        Promise.all(events_processed).then(
            (response) => {
                console.log(`${response.length} event(s) processed.`);
            }
        );
});

// event handler
function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        // ignore non-text-message event
        return Promise.resolve(null);
    }

    // create a echoing text message
    const echo = { type: 'text', text: "Hello World" };

    // use reply API
    return client.replyMessage(event.replyToken, echo);
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});
