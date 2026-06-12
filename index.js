require("dotenv").config();

const express = require("express");
const line = require("@line/bot-sdk");
const Groq = require("groq-sdk");

const app = express();

/*
  ===== 環境変数チェック =====
*/
console.log("GROQ:", !!process.env.GROQ_API_KEY);
console.log("TOKEN:", !!process.env.LINE_CHANNEL_ACCESS_TOKEN);
console.log("SECRET:", !!process.env.LINE_CHANNEL_SECRET);

/*
  ===== LINE設定 =====
*/
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

/*
  ===== LINE Client（v7安定版） =====
*/
const client = new line.Client(config);

/*
  ===== Groq =====
*/
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/*
  ===== Webhook =====
*/
app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];

    await Promise.all(
      events.map(async (event) => {
        if (
          event.type !== "message" ||
          event.message.type !== "text"
        ) return;

        const text = event.message.text.trim();

        if (!text.startsWith("!ai")) return;

        const prompt = text.replace(/^!ai\s*/, "");

        if (!prompt) {
          return client.replyMessage({
            replyToken: event.replyToken,
            messages: [
              {
                type: "text",
                text: "質問を入力してください"
              }
            ]
          });
        }

        try {
          const completion = await groq.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [
              {
                role: "user",
                content: prompt
              }
            ]
          });

          const answer =
            completion.choices?.[0]?.message?.content ||
            "回答がありません";

          return client.replyMessage({
            replyToken: event.replyToken,
            messages: [
              {
                type: "text",
                text: answer.slice(0, 5000)
              }
            ]
          });

        } catch (err) {
          console.error("Groq Error:", err);

          return client.replyMessage({
            replyToken: event.replyToken,
            messages: [
              {
                type: "text",
                text: "AI処理エラーが発生しました"
              }
            ]
          });
        }
      })
    );

    res.sendStatus(200);

  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

/*
  ===== ヘルスチェック =====
*/
app.get("/", (req, res) => {
  res.send("LINE + Groq Bot Running");
});

/*
  ===== 起動 =====
*/
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);

  console.log("LINE Token:", process.env.LINE_CHANNEL_ACCESS_TOKEN ? "OK" : "NG");
  console.log("LINE Secret:", process.env.LINE_CHANNEL_SECRET ? "OK" : "NG");
  console.log("Groq Key:", process.env.GROQ_API_KEY ? "OK" : "NG");
});