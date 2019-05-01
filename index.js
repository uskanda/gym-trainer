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
            return name + "君、今日は既にジムに行ったはずだが？もう一度行ったのであれば「行った」と返事をしてくれたまえ。"
        }
    }
    let c = new Counter();
    c.name = name;
    c.month = month;
    c.day = date.getDate();
    await c.save();
    let text = showStats(event,month);
    return text;
}

async function showStats(event, month){
    const profile = await client.getProfile(event.source.userId);
    const name = profile.displayName;
    const Counter = mongoose.model("Counter");
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
    return "む？もともと記録がないようだぞ";
}

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
    res.sendStatus(200);

    let events_processed = [];
    req.body.events.forEach(async (event) => {
        console.log(event)
        if (event.type == "message" && event.message.type == "text") {
            const message_text = event.message.text
            if (message_text == "こんにちは") {
                const profile = await client.getProfile(event.source.userId);
                events_processed.push(client.replyMessage(event.replyToken, {
                    type: "text",
                    text: "やあ、" +profile.displayName + "君。今日も私と一緒にトレーニングだ。\nジムに行ったら、画像をここにアップロードしたまえ。"
                }));
            }
            if (message_text == "stats" || message_text == "統計") {
                const date = new Date();
                const month = "" + date.getFullYear() + date.getMonth();
                let text = await showStats(event,month);
                if (text) {
                    events_processed.push(client.replyMessage(event.replyToken, {
                        type: "text",
                        text: text
                    }));
                }
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
                let text = await removeCount(event);
                if (text) {
                    events_processed.push(client.replyMessage(event.replyToken, {
                        type: "text",
                        text: text
                    }));
                }
            }
            if (message_text == "行く" ||
                message_text == "いく" ||
                message_text == "やる" ||
                message_text.endsWith("行く") ||
                message_text.endsWith("いく") ||
                message_text == "プラン"
                ) {
                let candidates = ["報告を期待しているぞ", 
                "よい心がけだ",
                "今日のおすすめマシンはスミスマシンだ",
                "今日のおすすめマシンはディアル・アジャスタブル・プーリーだ",
                "今日のおすすめマシンはアジャスタブルベンチだ",
                "今日のおすすめマシンはフラットベンチだ",
                "今日のおすすめはダンベルだ",
                "今日のおすすめマシンはチェストプレスだ",
                "今日のおすすめマシンはショルダープレスだ",
                "今日のおすすめマシンはラットプルダウン／ローロウだ",
                "今日のおすすめマシンはアブドミナルだ",
                "今日のおすすめマシンはバックエクステンションだ",
                "今日のおすすめマシンはアジャスタブル・アドミナルクランチだ。私のイチオシだ",
                "今日のおすすめマシンはレッグプレスだ",
                "今日のおすすめマシンはレッグカールだ",
                "今日のおすすめマシンはレッグエクステンションだ",
                "今日のおすすめマシンはトーソローテーションだ",
                "今日のおすすめマシンはフライ／リア・デルトイドフライだ。私もよくわかっていない",
                "今日のおすすめマシンはヒップ・アブダクター／アダクターだ",
                "今日のおすすめマシンはアシスト・ディップ・チンだ",
                "今日のおすすめマシンはトレッドミルだ",
                "今日のおすすめマシンはクロストレーナーだ",
                "今日のおすすめマシンはリカンベントバイクだ",
                "今日のおすすめマシンはアップライトバイクだ",
                "今日のおすすめマシンはパワーラックだ"];
                const profile = await client.getProfile(event.source.userId);
                let text= profile.displayName + "君。今日はジムに行くのだな？\n" + candidates[Math.floor(Math.random()*candidates.length)];
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
        if (event.type == "message" && event.message.type == "sticker" && event.message.packageId == "5730533") {
            events_processed.push(client.replyMessage(event.replyToken, {
                type: "text",
                text: "クソスタンプを送るのはやめたまえ"
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
