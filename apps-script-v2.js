function testLineNotification() {
  const props = PropertiesService.getScriptProperties();

  const workerUrl = props.getProperty("WORKER_URL");
  const apiKey = props.getProperty("NOTIFY_API_KEY");

  if (!workerUrl || !apiKey) {
    throw new Error("缺少 WORKER_URL 或 NOTIFY_API_KEY");
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
