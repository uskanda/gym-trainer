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
const CounterSchema = new Schema({name: String, month: String, day: Number, last: Date});
mongoose.model("Counter", CounterSchema);
mongoose.connect(process.env.MONGODB_URI);

async function manageCount(event,force=false){
    const profile = await client.getProfile(event.source.userId);
    const name = profile.displayName;
    const Counter = mongoose.model("Counter");
    const date = new Date();
    const month = "" + date.getFullYear() + date.getMonth();
    if(!force){
        let c = await Counter.findOne({ name: name, month: month, day: date.getDate() });
        if (c) {
            console.log("counter found");
            console.log(c);
            events_processed.push(client.replyMessage(event.replyToken, {
                type: "text",
                text: name + "君、今日は既にジムに行ったはずだが？もう一度行ったのであれば「行った」と返事をしてくれたまえ。"
            }));
            return;
        }
    }
    let c = new Counter();
    c.name = name;
    c.month = month;
    c.date = date.getDate();
    await c.save();
    const counters = await Counter.find({ month: month });
    let result = {};
    counters.forEach(co=>{
        if(co.name in result){
            result[co.name]++;
        } else {
            result[co.name]=1;
        }
    })
    let text = name + "君、ご苦労だった。今月の皆のジム状況は以下の通りだ。\n";
    //TODO: aggregate
    Object.keys(result).forEach(k => {
        text += "\n" + k + "\t" + result[k] + "回";
    });
    return text;
}

async function removeCount(event){
    const profile = await client.getProfile(event.source.userId);
    const name = profile.displayName;
    const Counter = mongoose.model("Counter");
    const date = new Date();
    const month = "" + date.getFullYear() + date.getMonth();
    let c = await Counter.findOne({ name: name, month: month, day: date.getDate() });
    if(c){
        await Counter.deleteOne({name:name, month:month, day:date.getDate() });
        return name + "君。今日は行っていないのだな？記録を消去したぞ";
    }
}

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
    res.sendStatus(200);

    let events_processed = [];
    req.body.events.forEach(async (event) => {
        if (event.type == "message" && event.message.type == "text") {
            const message_text = event.message.text
            if (message_text == "こんにちは") {
                const profile = await client.getProfile(event.source.userId);
                events_processed.push(client.replyMessage(event.replyToken, {
                    type: "text",
                    text: profile.displayName + "さん、こんにちは"
                }));
            }
            if (message_text == "行った" || message_text == "いった") {
                let text = await manageCount(event,true);
                if (text) {
                    events_processed.push(client.replyMessage(event.replyToken, {
                        type: "text",
                        text: text
                    }));
                }
            }
            if (message_text == "行ってない" || message_text == "いってない") {
                let text = await removeCount(event,true);
                if (text) {
                    events_processed.push(client.replyMessage(event.replyToken, {
                        type: "text",
                        text: text
                    }));
                }
            }
        }
        if (event.type == "message" && event.message.type == "image") {
            let text = await manageCount(event);
            if(text){
                events_processed.push(client.replyMessage(event.replyToken, {
                    type: "text",
                    text: text
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
