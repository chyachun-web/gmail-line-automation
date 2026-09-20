export default {
  async fetch(request, env) {

    // 瀏覽器測試
    if (request.method === "GET") {
      return new Response("Gmail LINE Automation is running.", {
        status: 200
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405
      });
    }

    const signature = request.headers.get("x-line-signature");

    if (!signature) {
      return new Response("Unauthorized", {
        status: 401
      });
    }

    const body = await request.text();

    const isValid = await verifyLineSignature(
      body,
      signature,
      env.LINE_CHANNEL_SECRET
    );

    if (!isValid) {
      return new Response("Unauthorized", {
        status: 401
      });
    }

    const data = JSON.parse(body);

    if (data.events && data.events.length > 0) {
      for (const event of data.events) {

        if (
          event.type !== "message" ||
          event.message?.type !== "text"
        ) {
          continue;
        }

        const text = event.message.text.trim();
        const userId = event.source?.userId;

        // 綁定
        if (text === "綁定" && userId) {
          await env.LINE_DATA.put(
            "LINE_USER_ID",
            userId
          );

          await replyLineMessage(
            event.replyToken,
            "LINE 綁定完成 ✓",
            env.LINE_CHANNEL_ACCESS_TOKEN
          );
        }

        // 測試
        if (text === "測試") {
          await replyLineMessage(
            event.replyToken,
            "Gmail LINE Automation 連線成功 ✓",
            env.LINE_CHANNEL_ACCESS_TOKEN
          );
        }
      }
    }

    return new Response("OK", {
      status: 200
    });
  }
};


// LINE 自動回覆
async function replyLineMessage(
  replyToken,
  text,
  accessToken
) {
  const response = await fetch(
    "https://api.line.me/v2/bot/message/reply",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: [
          {
            type: "text",
            text: text
          }
        ]
      })
    }
  );

  if (!response.ok) {
    console.error(
      "LINE reply failed:",
      response.status,
      await response.text()
    );
  }
}


// LINE Signature 驗證
async function verifyLineSignature(
  body,
  signature,
  channelSecret
) {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(channelSecret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );

  const calculatedSignature = btoa(
    String.fromCharCode(
      ...new Uint8Array(signed)
    )
  );

  return calculatedSignature === signature;
}
