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
