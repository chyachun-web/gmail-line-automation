function sendLatestGmailToLine() {
  const props = PropertiesService.getScriptProperties();

  const workerUrl = props.getProperty("WORKER_URL");
  const apiKey = props.getProperty("NOTIFY_API_KEY");

  if (!workerUrl || !apiKey) {
    throw new Error("缺少 WORKER_URL 或 NOTIFY_API_KEY");
  }

  // 取得收件匣最新一個郵件串
  const threads = GmailApp.getInboxThreads(0, 1);

  if (threads.length === 0) {
    console.log("目前收件匣沒有信件");
    return;
  }

  // 取得最新一封信
  const messages = threads[0].getMessages();
  const latestMessage = messages[messages.length - 1];

  // Gmail 每封信都有自己的唯一 ID
  const messageId = latestMessage.getId();

  // 讀取上一次已通知的 Gmail Message ID
  const lastMessageId = props.getProperty("LAST_NOTIFIED_MESSAGE_ID");

  // 如果這封已經通知過，就停止
  if (messageId === lastMessageId) {
    console.log("這封信已經通知過，不重複發送。");
    return;
  }

  const sender = latestMessage.getFrom();
  const subject = latestMessage.getSubject();

  const lineMessage =
    "📩 Gmail 新信件\n\n" +
    "寄件者：" + sender + "\n" +
    "主旨：" + subject;

  const payload = {
    message: lineMessage
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

  const status = response.getResponseCode();

  console.log("Status: " + status);
  console.log("Response: " + response.getContentText());

  // LINE 確定發送成功後，才記錄這封信
  if (status >= 200 && status < 300) {
    props.setProperty("LAST_NOTIFIED_MESSAGE_ID", messageId);
    console.log("已記錄這封 Gmail，不會再次通知。");
  }
}
