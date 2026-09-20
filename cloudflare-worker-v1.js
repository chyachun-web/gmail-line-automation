export default {
  async fetch(request, env, ctx) {
    if (request.method === "POST") {
      return new Response("OK", {
        status: 200,
        headers: {
          "Content-Type": "text/plain"
        }
      });
    }

    return new Response("Gmail LINE Automation is running.", {
      status: 200,
      headers: {
        "Content-Type": "text/plain"
      }
    });
  }
};
