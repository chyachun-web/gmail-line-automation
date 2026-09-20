// ======================================================
// Gmail → LINE Automation
// Chloe Automation Lab
// ======================================================


// ======================================================
// ⭐ 學生設定區
// ======================================================
//
// 想修改 Gmail 分類，只需要修改這個區域。
// 下方的自動化程式不需要修改。
//
// name     = LINE 顯示的分類名稱
// icon     = 分類 Emoji
// keywords = 判斷 Gmail 的關鍵字
// notify   = true  → 傳 LINE
//            false → 不傳 LINE
//
// ======================================================

const EMAIL_CATEGORIES = [

  {
    name: "銀行／信用卡",
    icon: "🏦",
    notify: true,

    keywords: [
      "銀行",
      "bank",
      "信用卡",
      "credit card",
      "帳單",
      "繳款",
      "statement"
    ]
  },


  {
    name: "消費通知",
    icon: "💳",
    notify: true,

    keywords: [
      "消費",
      "交易",
      "付款",
      "payment",
      "purchase",
      "刷卡",
      "扣款",
      "訂單",
      "order"
    ]
  },


  {
    name: "AI／開發工具",
    icon: "🤖",
    notify: true,

    keywords: [
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
    ]
  },


  {
    name: "Google／帳戶安全",
    icon: "🔐",
    notify: true,

    keywords: [
      "google",
      "security",
      "安全性",
      "登入",
      "login",
      "sign-in",
      "帳戶",
      "account"
    ]
  },


  {
    name: "購物",
    icon: "🛒",
    notify: true,

    keywords: [
      "蝦皮",
      "shopee",
      "momo",
      "pchome",
      "出貨",
      "到貨"
    ]
  }

];


// ======================================================
// 其他設定
// ======================================================

// 每次最多檢查最近幾個 Gmail 郵件串
const MAX_THREADS_TO_CHECK = 20;

// 最多保存多少筆已處理 Gmail ID
const MAX_PROCESSED_IDS = 200;


// ======================================================
// 1. 測試 Gmail 連線
// ======================================================

function testGmailConnection() {

  const threads =
    GmailApp.getInboxThreads(0, 5);

  console.log("成功讀取 Gmail");
  console.log(
    "找到郵件串數量：" +
    threads.length
  );


  threads.forEach(function(thread) {

    const messages =
      thread.getMessages();

    const latestMessage =
      messages[messages.length - 1];


    console.log(
      "寄件者：" +
      latestMessage.getFrom()
    );

    console.log(
      "主旨：" +
      latestMessage.getSubject()
    );

  });

}


// ======================================================
// 2. 測試 LINE 通知
// ======================================================

function testLineNotification() {

  sendToLine(
    "🎉 Gmail → LINE 測試成功！"
  );

}


// ======================================================
// 3. Gmail 自動分類
// ======================================================

function classifyEmail(sender, subject) {

  const text =
    (
      sender +
      " " +
      subject
    ).toLowerCase();


  // ------------------------------------------------------
  // 依照學生設定的分類逐一判斷
  // ------------------------------------------------------

  for (
    let i = 0;
    i < EMAIL_CATEGORIES.length;
    i++
  ) {

    const category =
      EMAIL_CATEGORIES[i];


    const matched =
      category.keywords.some(
        function(keyword) {

          return text.includes(
            keyword.toLowerCase()
          );

        }
      );


    if (matched) {

      return category;

    }

  }


  // ------------------------------------------------------
  // 找不到任何分類
  // ------------------------------------------------------

  return {
    name: "其他",
    icon: "📩",
    notify: false
  };

}


// ======================================================
// 4. 正式 Gmail 自動檢查
// ======================================================

function checkNewGmail() {

  const props =
    PropertiesService
      .getScriptProperties();


  // ------------------------------------------------------
  // 取得已處理 Gmail ID
  // ------------------------------------------------------

  const savedIds =
    props.getProperty(
      "PROCESSED_GMAIL_IDS"
    );


  let processedIds = [];


  if (savedIds) {

    try {

      processedIds =
        JSON.parse(savedIds);

    } catch (error) {

      processedIds = [];

    }

  }


  // ------------------------------------------------------
  // 取得最近 Gmail 郵件串
  // ------------------------------------------------------

  const threads =
    GmailApp.getInboxThreads(
      0,
      MAX_THREADS_TO_CHECK
    );


  let newMessages = [];


  // ------------------------------------------------------
  // 找出尚未處理的 Gmail
  // ------------------------------------------------------

  threads.forEach(
    function(thread) {

      const messages =
        thread.getMessages();


      messages.forEach(
        function(message) {

          const messageId =
            message.getId();


          if (
            !processedIds.includes(
              messageId
            )
          ) {

            newMessages.push(
              message
            );

          }

        }
      );

    }
  );


  // ------------------------------------------------------
  // 沒有新信
  // ------------------------------------------------------

  if (
    newMessages.length === 0
  ) {

    console.log(
      "沒有需要處理的新 Gmail。"
    );

    return;

  }


  // ------------------------------------------------------
  // 按照 Gmail 時間排序
  // 舊 → 新
  // ------------------------------------------------------

  newMessages.sort(
    function(a, b) {

      return (
        a.getDate().getTime() -
        b.getDate().getTime()
      );

    }
  );


  // ------------------------------------------------------
  // 處理每一封 Gmail
  // ------------------------------------------------------

  newMessages.forEach(
    function(message) {

      const messageId =
        message.getId();

      const sender =
        message.getFrom();

      const subject =
        message.getSubject();


      // --------------------------------------------------
      // Gmail 分類
      // --------------------------------------------------

      const classification =
        classifyEmail(
          sender,
          subject
        );


      console.log(
        "分類：" +
        classification.name +
        "｜" +
        subject
      );


      // --------------------------------------------------
      // notify = true
      // 才傳送 LINE
      // --------------------------------------------------

      if (
        classification.notify === true
      ) {


        const lineMessage =
          classification.icon +
          " " +
          classification.name +
          "\n\n" +

          "寄件者：" +
          sender +
          "\n" +

          "主旨：" +
          subject;


        const success =
          sendToLine(
            lineMessage
          );


        // ------------------------------------------------
        // LINE 成功才標記為已處理
        // ------------------------------------------------

        if (success) {

          processedIds.push(
            messageId
          );


          console.log(
            "LINE 通知成功：" +
            subject
          );

        }


      } else {


        // ------------------------------------------------
        // 不需要 LINE 通知
        // 仍然標記為已處理
        // 避免下一次一直重新判斷
        // ------------------------------------------------

        processedIds.push(
          messageId
        );


        console.log(
          "此分類不發送 LINE：" +
          classification.name
        );

      }

    }
  );


  // ------------------------------------------------------
  // 避免 Script Properties 無限增加
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
  // 儲存 Gmail ID
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
// 5. 傳送 LINE
// Apps Script → Cloudflare → LINE
// ======================================================

function sendToLine(message) {

  const props =
    PropertiesService
      .getScriptProperties();


  const workerUrl =
    props.getProperty(
      "WORKER_URL"
    );


  const apiKey =
    props.getProperty(
      "NOTIFY_API_KEY"
    );


  // ------------------------------------------------------
  // 檢查設定
  // ------------------------------------------------------

  if (
    !workerUrl ||
    !apiKey
  ) {

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
  // 傳送 Cloudflare
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
            "Bearer " +
            apiKey

        },

        payload:
          JSON.stringify(
            payload
          ),

        muteHttpExceptions:
          true

      }
    );


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


  return (
    status >= 200 &&
    status < 300
  );

}


// ======================================================
// 6. 第一次使用：初始化 Gmail
// ======================================================

function initializeGmail() {

  const props =
    PropertiesService
      .getScriptProperties();


  const threads =
    GmailApp.getInboxThreads(
      0,
      MAX_THREADS_TO_CHECK
    );


  let processedIds = [];


  threads.forEach(
    function(thread) {

      const messages =
        thread.getMessages();


      messages.forEach(
        function(message) {

          processedIds.push(
            message.getId()
          );

        }
      );

    }
  );


  // ------------------------------------------------------
  // 只保存最近指定數量 ID
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
  // 儲存初始化資料
  // ------------------------------------------------------

  props.setProperty(
    "PROCESSED_GMAIL_IDS",

    JSON.stringify(
      processedIds
    )
  );


  console.log(
    "初始化完成 ✓"
  );


  console.log(
    "目前 Gmail 已視為舊信，之後收到的新信才會進行自動分類。"
  );

}
