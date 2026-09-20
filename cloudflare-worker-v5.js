export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Apps Script → Cloudflare → LINE
    if (url.pathname === "/notify") {
      return handleNotify(request, env);
    }

    // 瀏覽器測試
    if (request.method === "GET") {
      return new Response("Gmail LINE Automation is running.", {
        status: 200
      });
    }

    // LINE Webhook
    if (request.method === "POST") {
      return handleLineWebhook(request, env);
    }

    return new Response("Method Not Allowed", {
      status: 405
    });
  }
};


// ==============================
// Apps Script → LINE 通知
// ==============================
async function handleNotify(request, env) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405
    });
  }

  // 驗證 Apps Script 的 API Key
  const authorization = request.headers.get("Authorization");

  if (
    !authorization ||
    authorization !== `Bearer ${env.NOTIFY_API_KEY}`
  ) {
    return new Response("Unauthorized", {
      status: 401
    });
  }

  try {
    const data = await request.json();
    const message = data.message?.trim();

    if (!message) {
      return new Response("Missing message", {
        status: 400
      });
    }

    // 從 KV 取得已綁定的 LINE User ID
    const userId = await env.LINE_DATA.get("LINE_USER_ID");

    if (!userId) {
      return new Response("LINE user is not bound", {
        status: 400
      });
    }

    // 主動發送 LINE 訊息
    const lineResponse = await fetch(
      "https://api.line.me/v2/bot/message/push",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization":
            `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          to: userId,
          messages: [
            {
              type: "text",
              text: message
            }
          ]
        })
      }
    );

    if (!lineResponse.ok) {
      const errorText = await lineResponse.text();
      console.error("LINE push failed:", errorText);

      return new Response("LINE push failed", {
        status: 502
      });
    }

    return new Response("Notification sent", {
      status: 200
    });

  } catch (error) {
    console.error(error);

    return new Response("Internal Server Error", {
      status: 500
    });
  }
}


// ==============================
// LINE Webhook
// ==============================
async function handleLineWebhook(request, env) {
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


// ==============================
// LINE Reply
// ==============================
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


// ==============================
// LINE Signature 驗證
// ==============================
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
