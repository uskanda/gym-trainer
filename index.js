'use strict';

const line = require('@line/bot-sdk');
const express = require('express');

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

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
        res.sendStatus(200);

        let events_processed = [];
        req.body.events.forEach((event) => {
            if (event.type == "message" && event.message.type == "text"){
                if (event.message.text == "こんにちは"){
                    events_processed.push(bot.replyMessage(event.replyToken, {
                        type: "text",
                        text: "これはこれは"
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
