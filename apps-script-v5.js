// ======================================================
// Gmail → LINE Automation
// Chloe Automation Lab
// ======================================================


// ======================================================
// 1. 測試 Gmail 是否可以正常讀取
// ======================================================

function testGmailConnection() {
  const threads = GmailApp.getInboxThreads(0, 5);

  console.log("成功讀取 Gmail");
  console.log("找到信件串數量：" + threads.length);

  threads.forEach(function(thread) {
    const messages = thread.getMessages();
    const latestMessage = messages[messages.length - 1];

    console.log("寄件者：" + latestMessage.getFrom());
    console.log("主旨：" + latestMessage.getSubject());
  });
}


// ======================================================
// 2. 測試 Apps Script → Cloudflare → LINE
// ======================================================

function testLineNotification() {
  const props = PropertiesService.getScriptProperties();

  const workerUrl = props.getProperty("WORKER_URL");
  const apiKey = props.getProperty("NOTIFY_API_KEY");

  if (!workerUrl || !apiKey) {
    throw new Error(
      "缺少 WORKER_URL 或 NOTIFY_API_KEY，請先到指令碼屬性完成設定。"
    );
  }

  const payload = {
    message: "🎉 Gmail → LINE 測試成功！"
  };

  const response = UrlFetchApp.fetch(workerUrl, {
    method: "post",
    contentType: "application/json",

    headers: {
      "Authorization": "Bearer " + apiKey
    },

    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  console.log("Status: " + response.getResponseCode());
  console.log("Response: " + response.getContentText());
}


// ======================================================
// 3. Gmail 自動分類
// ======================================================

function classifyEmail(sender, subject) {

  // 將寄件者與主旨合併，方便判斷
  const text = (sender + " " + subject).toLowerCase();


  // ------------------------------------------------------
  // 銀行／信用卡
  // ------------------------------------------------------

  const bankingKeywords = [
    "銀行",
    "bank",
    "信用卡",
    "credit card",
    "帳單",
    "繳款",
    "statement"
  ];

  if (
    bankingKeywords.some(function(keyword) {
      return text.includes(keyword);
    })
  ) {
    return {
      category: "銀行／信用卡",
      icon: "🏦"
    };
  }


  // ------------------------------------------------------
  // 消費通知
  // ------------------------------------------------------

  const purchaseKeywords = [
    "消費",
    "交易",
    "付款",
    "payment",
    "purchase",
    "刷卡",
    "扣款",
    "訂單",
    "order"
  ];

  if (
    purchaseKeywords.some(function(keyword) {
      return text.includes(keyword);
    })
  ) {
    return {
      category: "消費通知",
      icon: "💳"
    };
  }


  // ------------------------------------------------------
  // AI／開發工具
  // ------------------------------------------------------

  const aiKeywords = [
    "openai",
    "chatgpt",
    "claude",
    "anthropic",
    "runway",
    "gamma",
    "github",
    "cloudflare",
    "vercel",
    "aws",
    "amazon web services"
  ];

  if (
    aiKeywords.some(function(keyword) {
      return text.includes(keyword);
    })
  ) {
    return {
      category: "AI／開發工具",
      icon: "🤖"
    };
  }


  // ------------------------------------------------------
  // Google／帳戶安全
  // ------------------------------------------------------

  const securityKeywords = [
    "google",
    "security",
    "安全性",
    "登入",
    "login",
    "sign-in",
    "帳戶",
    "account"
  ];

  if (
    securityKeywords.some(function(keyword) {
      return text.includes(keyword);
    })
  ) {
    return {
      category: "Google／帳戶安全",
      icon: "🔐"
    };
  }


  // ------------------------------------------------------
  // 無法分類
  // ------------------------------------------------------

  return {
    category: "其他",
    icon: "📩"
  };
}


// ======================================================
// 4. 取得最新 Gmail → 分類 → 發送 LINE
// ======================================================

function sendLatestGmailToLine() {

  const props = PropertiesService.getScriptProperties();

  const workerUrl = props.getProperty("WORKER_URL");
  const apiKey = props.getProperty("NOTIFY_API_KEY");


  // ------------------------------------------------------
  // 檢查必要設定
  // ------------------------------------------------------

  if (!workerUrl || !apiKey) {
    throw new Error(
      "缺少 WORKER_URL 或 NOTIFY_API_KEY，請先到指令碼屬性完成設定。"
    );
  }


  // ------------------------------------------------------
  // 取得 Gmail 收件匣最新一個郵件串
  // ------------------------------------------------------

  const threads = GmailApp.getInboxThreads(0, 1);

  if (threads.length === 0) {
    console.log("目前收件匣沒有信件");
    return;
  }


  // ------------------------------------------------------
  // 取得郵件串中最新的一封 Gmail
  // ------------------------------------------------------

  const messages = threads[0].getMessages();

  const latestMessage =
    messages[messages.length - 1];


  // ------------------------------------------------------
  // 取得 Gmail Message ID
  // 每一封 Gmail 都有自己的唯一 ID
  // ------------------------------------------------------

  const messageId = latestMessage.getId();


  // ------------------------------------------------------
  // 取得上一封已經通知過的 Gmail ID
  // ------------------------------------------------------

  const lastMessageId =
    props.getProperty("LAST_NOTIFIED_MESSAGE_ID");


  // ------------------------------------------------------
  // 防止同一封 Gmail 重複通知
  // ------------------------------------------------------

  if (messageId === lastMessageId) {
    console.log(
      "這封信已經通知過，不重複發送。"
    );

    return;
  }


  // ------------------------------------------------------
  // 取得寄件者與主旨
  // ------------------------------------------------------

  const sender = latestMessage.getFrom();
  const subject = latestMessage.getSubject();


  // ------------------------------------------------------
  // 自動分類 Gmail
  // ------------------------------------------------------

  const classification =
    classifyEmail(sender, subject);


  // ------------------------------------------------------
  // 建立 LINE 通知內容
  // ------------------------------------------------------

  const lineMessage =
    classification.icon +
    " " +
    classification.category +
    "\n\n" +
    "寄件者：" +
    sender +
    "\n" +
    "主旨：" +
    subject;


  // ------------------------------------------------------
  // 準備傳給 Cloudflare Worker
  // ------------------------------------------------------

  const payload = {
    message: lineMessage
  };


  // ------------------------------------------------------
  // Apps Script → Cloudflare Worker
  // ------------------------------------------------------

  const response = UrlFetchApp.fetch(
    workerUrl,
    {
      method: "post",

      contentType: "application/json",

      headers: {
        "Authorization":
          "Bearer " + apiKey
      },

      payload:
        JSON.stringify(payload),

      muteHttpExceptions: true
    }
  );


  // ------------------------------------------------------
  // 取得 Cloudflare 回應
  // ------------------------------------------------------

  const status =
    response.getResponseCode();

  const responseText =
    response.getContentText();


  console.log(
    "Status: " + status
  );

  console.log(
    "Response: " + responseText
  );


  // ------------------------------------------------------
  // LINE 發送成功後
  // 才記錄這封 Gmail 的 Message ID
  // ------------------------------------------------------

  if (
    status >= 200 &&
    status < 300
  ) {

    props.setProperty(
      "LAST_NOTIFIED_MESSAGE_ID",
      messageId
    );

    console.log(
      "已記錄這封 Gmail，不會再次通知。"
    );

  } else {

    console.log(
      "LINE 發送失敗，因此不記錄 Gmail ID。"
    );
  }
}
