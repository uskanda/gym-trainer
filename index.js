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

let Schema = mongoose.Schema;
const CounterSchema = new Schema({name: String, count: Number, month: String, last: Date});
mongoose.model("Counter", CounterSchema);
mongoose.connect(process.env.MONGODB_URI);

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
        res.sendStatus(200);

        let events_processed = [];
        req.body.events.forEach(async (event) => {
            if (event.type == "message" && event.message.type == "text"){
                if (event.message.text == "こんにちは"){
                    const profile = await client.getProfile(event.source.userId);
                    events_processed.push(client.replyMessage(event.replyToken, {
                        type: "text",
                        text: profile.displayName + "さん、こんにちは"
                    }));
                }
            }
            if (event.type == "message" && event.message.type == "image"){
                const profile = await client.getProfile(event.source.userId);
                const name = profile.displayName;
                const Counter = mongoose.model("Counter");
                const date = new Date();
                const month = ""+date.getFullYear()+date.getMonth();
                let c = await Counter.findOne({name: name, month: month});
                if(c){
                    console.log("counter found");
                    console.log(c);
                } else {
                    console.log("counter not found");
                    c = new Counter();
                    c.name = name;
                    c.month = month;
                    c.count = 0;
                }
                c.count++;
                await c.save();
                const counts = await Counter.find({month: month});
                let text = name + "君、ご苦労だった。今月の皆の状況は以下の通りだ。";
                counts.forEach(co=>{
                    text += "¥n" + co.name + "¥t" + co.count + "回";
                });

                events_processed.push(client.replyMessage(event.replyToken, {
                    type: "text",
                    text: text
                }));
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
