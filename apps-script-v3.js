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

  // 取得這個郵件串中的最新一封信
  const messages = threads[0].getMessages();
  const latestMessage = messages[messages.length - 1];

  const sender = latestMessage.getFrom();
  const subject = latestMessage.getSubject();

  // 要傳到 LINE 的內容
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

  console.log("Status: " + response.getResponseCode());
  console.log("Response: " + response.getContentText());
}
