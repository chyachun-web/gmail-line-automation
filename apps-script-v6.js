// ======================================================
// Gmail → LINE Automation
// Chloe Automation Lab
// ======================================================


// ======================================================
// 基本設定
// ======================================================

// 每次最多檢查最近幾個 Gmail 郵件串
const MAX_THREADS_TO_CHECK = 20;

// 最多保存多少筆「已通知 Gmail ID」
const MAX_PROCESSED_IDS = 200;


// ======================================================
// 1. 測試 Gmail 連線
// ======================================================

function testGmailConnection() {
  const threads = GmailApp.getInboxThreads(0, 5);

  console.log("成功讀取 Gmail");
  console.log("找到郵件串數量：" + threads.length);

  threads.forEach(function(thread) {
    const messages = thread.getMessages();
    const latestMessage = messages[messages.length - 1];

    console.log("寄件者：" + latestMessage.getFrom());
    console.log("主旨：" + latestMessage.getSubject());
  });
}


// ======================================================
// 2. 測試 LINE 通知
// ======================================================

function testLineNotification() {
  sendToLine("🎉 Gmail → LINE 測試成功！");
}


// ======================================================
// 3. Gmail 自動分類
// ======================================================

function classifyEmail(sender, subject) {

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
  // 其他
  // ------------------------------------------------------

  return {
    category: "其他",
    icon: "📩"
  };
}


// ======================================================
// 4. 正式 Gmail 自動檢查
// ======================================================

function checkNewGmail() {

  const props = PropertiesService.getScriptProperties();

  // 取得之前已經通知過的 Gmail ID
  const savedIds =
    props.getProperty("PROCESSED_GMAIL_IDS");

  let processedIds = [];

  if (savedIds) {
    try {
      processedIds = JSON.parse(savedIds);
    } catch (error) {
      processedIds = [];
    }
  }


  // ------------------------------------------------------
  // 取得最近的 Gmail 郵件串
  // ------------------------------------------------------

  const threads =
    GmailApp.getInboxThreads(
      0,
      MAX_THREADS_TO_CHECK
    );

  let newMessages = [];


  // ------------------------------------------------------
  // 收集尚未通知過的 Gmail
  // ------------------------------------------------------

  threads.forEach(function(thread) {

    const messages = thread.getMessages();

    messages.forEach(function(message) {

      const messageId = message.getId();

      if (!processedIds.includes(messageId)) {

        newMessages.push(message);
      }
    });
  });


  // ------------------------------------------------------
  // 沒有新信
  // ------------------------------------------------------

  if (newMessages.length === 0) {

    console.log(
      "沒有需要通知的新 Gmail。"
    );

    return;
  }


  // ------------------------------------------------------
  // 按照時間排序
  // 舊 → 新
  // ------------------------------------------------------

  newMessages.sort(function(a, b) {

    return (
      a.getDate().getTime() -
      b.getDate().getTime()
    );
  });


  // ------------------------------------------------------
  // 處理每一封新 Gmail
  // ------------------------------------------------------

  newMessages.forEach(function(message) {

    const messageId =
      message.getId();

    const sender =
      message.getFrom();

    const subject =
      message.getSubject();


    // ----------------------------------------------------
    // 自動分類
    // ----------------------------------------------------

    const classification =
      classifyEmail(
        sender,
        subject
      );


    // ----------------------------------------------------
    // 建立 LINE 訊息
    // ----------------------------------------------------

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


    // ----------------------------------------------------
    // 發送 LINE
    // ----------------------------------------------------

    const success =
      sendToLine(lineMessage);


    // ----------------------------------------------------
    // 發送成功才記錄 Gmail ID
    // ----------------------------------------------------

    if (success) {

      processedIds.push(
        messageId
      );

      console.log(
        "已通知：" + subject
      );
    }
  });


  // ------------------------------------------------------
  // 避免 Script Properties 無限增加
  // 只保存最近 200 筆
  // ------------------------------------------------------

  if (
    processedIds.length >
    MAX_PROCESSED_IDS
  ) {

    processedIds =
      processedIds.slice(
        -MAX_PROCESSED_IDS
      );
  }


  // ------------------------------------------------------
  // 保存已處理 Gmail ID
  // ------------------------------------------------------

  props.setProperty(
    "PROCESSED_GMAIL_IDS",
    JSON.stringify(
      processedIds
    )
  );

  console.log(
    "Gmail 檢查完成。"
  );
}


// ======================================================
// 5. 傳送訊息到 Cloudflare → LINE
// ======================================================

function sendToLine(message) {

  const props =
    PropertiesService.getScriptProperties();

  const workerUrl =
    props.getProperty("WORKER_URL");

  const apiKey =
    props.getProperty("NOTIFY_API_KEY");


  // ------------------------------------------------------
  // 檢查必要設定
  // ------------------------------------------------------

  if (!workerUrl || !apiKey) {

    throw new Error(
      "缺少 WORKER_URL 或 NOTIFY_API_KEY，請先完成指令碼屬性設定。"
    );
  }


  // ------------------------------------------------------
  // 建立資料
  // ------------------------------------------------------

  const payload = {
    message: message
  };


  // ------------------------------------------------------
  // 傳給 Cloudflare Worker
  // ------------------------------------------------------

  const response =
    UrlFetchApp.fetch(
      workerUrl,
      {
        method: "post",

        contentType:
          "application/json",

        headers: {
          "Authorization":
            "Bearer " + apiKey
        },

        payload:
          JSON.stringify(
            payload
          ),

        muteHttpExceptions:
          true
      }
    );


  // ------------------------------------------------------
  // Cloudflare 回傳結果
  // ------------------------------------------------------

  const status =
    response.getResponseCode();

  const responseText =
    response.getContentText();


  console.log(
    "LINE Status: " +
    status
  );

  console.log(
    "LINE Response: " +
    responseText
  );


  // ------------------------------------------------------
  // HTTP 2xx = 發送成功
  // ------------------------------------------------------

  return (
    status >= 200 &&
    status < 300
  );
}
