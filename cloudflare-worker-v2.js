export default {
  async fetch(request, env) {
    // 瀏覽器測試
    if (request.method === "GET") {
      return new Response("Gmail LINE Automation is running.", {
        status: 200
      });
    }

    // 只接受 POST
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405
      });
    }

    // 取得 LINE Signature
    const signature = request.headers.get("x-line-signature");

    if (!signature) {
      return new Response("Unauthorized", {
        status: 401
      });
    }

    // 必須先取得原始 body，不能先 JSON.parse
    const body = await request.text();

    // 驗證 LINE Signature
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

    // 目前先觀察 LINE event
    if (data.events && data.events.length > 0) {
      const event = data.events[0];

      if (event.source?.userId) {
        console.log("LINE User ID received.");
      }
    }

    return new Response("OK", {
      status: 200
    });
  }
};


async function verifyLineSignature(body, signature, channelSecret) {
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
    String.fromCharCode(...new Uint8Array(signed))
  );

  return calculatedSignature === signature;
}
