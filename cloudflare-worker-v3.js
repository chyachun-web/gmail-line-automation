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

        // 只處理文字訊息
        if (
          event.type === "message" &&
          event.message?.type === "text" &&
          event.message.text.trim() === "綁定" &&
          event.source?.userId
        ) {

          // 將 User ID 儲存到 Cloudflare KV
          await env.LINE_DATA.put(
            "LINE_USER_ID",
            event.source.userId
          );

          console.log("LINE User ID saved successfully.");
        }
      }
    }

    return new Response("OK", {
      status: 200
    });
  }
};


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
