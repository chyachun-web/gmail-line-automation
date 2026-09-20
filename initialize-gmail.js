// ======================================================
// 6. 第一次使用：初始化 Gmail
// ======================================================

function initializeGmail() {

  const props =
    PropertiesService.getScriptProperties();

  const threads =
    GmailApp.getInboxThreads(
      0,
      MAX_THREADS_TO_CHECK
    );

  let processedIds = [];

  threads.forEach(function(thread) {

    const messages =
      thread.getMessages();

    messages.forEach(function(message) {

      processedIds.push(
        message.getId()
      );

    });

  });


  // 只保留最近指定數量的 ID
  if (
    processedIds.length >
    MAX_PROCESSED_IDS
  ) {

    processedIds =
      processedIds.slice(
        -MAX_PROCESSED_IDS
      );

  }


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
    "已將目前 Gmail 視為舊信，之後收到的新信才會通知 LINE。"
  );
}
