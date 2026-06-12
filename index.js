require("dotenv").config();
require("dotenv").config();

console.log("GROQ:", !!process.env.GROQ_API_KEY);
console.log("TOKEN:", !!process.env.LINE_CHANNEL_ACCESS_TOKEN);
console.log("SECRET:", !!process.env.LINE_CHANNEL_SECRET);
const express = require("express");
const line = require("@line/bot-sdk");
const Groq = require("groq-sdk");

const app = express();

/*
  LINE設定
  .env から読み込む
*/
const config = {
  channelAccessToken:
    process.env.LINE_CHANNEL_ACCESS_TOKEN,

  channelSecret:
    process.env.LINE_CHANNEL_SECRET
};

/*
  LINE Messaging API Client
*/
const client =
  new line.messagingApi.MessagingApiClient({
    channelAccessToken:
      process.env.LINE_CHANNEL_ACCESS_TOKEN
  });

/*
  Groq
*/
const groq = new Groq({
  apiKey:
    process.env.GROQ_API_KEY
});

/*
  Webhook
*/
app.post(
  "/webhook",
  line.middleware(config),
  async (req, res) => {

    try {

      const events =
        req.body.events || [];

      for (const event of events) {

        /*
          テキスト以外は無視
        */
        if (
          event.type !== "message" ||
          event.message.type !== "text"
        ) {
          continue;
        }

        const text =
          event.message.text.trim();

        /*
          !ai以外は無視
        */
        if (!text.startsWith("!ai")) {
          continue;
        }

        /*
          !ai の後ろを取得
        */
        const prompt =
          text.replace(/^!ai\s*/, "");

        if (!prompt) {

          await client.replyMessage({
            replyToken:
              event.replyToken,

            messages: [
              {
                type: "text",
                text:
                  "質問を入力してください"
              }
            ]
          });

          continue;
        }

        try {

          const completion =
            await groq.chat.completions.create({
              model:
                "openai/gpt-oss-120b",

              messages: [
                {
                  role: "user",
                  content: prompt
                }
              ]
            });

          const answer =
            completion.choices[0]
              .message.content ||
            "回答がありません";

          await client.replyMessage({
            replyToken:
              event.replyToken,

            messages: [
              {
                type: "text",
                text:
                  answer.slice(
                    0,
                    5000
                  )
              }
            ]
          });

        } catch (error) {

          console.error(
            "Groq Error:",
            error
          );

          await client.replyMessage({
            replyToken:
              event.replyToken,

            messages: [
              {
                type: "text",
                text:
                  "AI処理中にエラーが発生しました"
              }
            ]
          });
        }
      }

      res.sendStatus(200);

    } catch (error) {

      console.error(error);

      res.sendStatus(500);
    }
  }
);

/*
  Railway確認用
*/
app.get("/", (req, res) => {
  res.send(
    "LINE + Groq Bot Running"
  );
});

/*
  Railwayが自動でPORTを設定する
*/
const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `Server started on port ${PORT}`
  );

  console.log(
    "LINE Token:",
    process.env
      .LINE_CHANNEL_ACCESS_TOKEN
      ? "OK"
      : "NG"
  );

  console.log(
    "LINE Secret:",
    process.env
      .LINE_CHANNEL_SECRET
      ? "OK"
      : "NG"
  );

  console.log(
    "Groq Key:",
    process.env.GROQ_API_KEY
      ? "OK"
      : "NG"
  );
});