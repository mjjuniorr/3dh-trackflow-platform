const http = require("node:http");

// Probe only the local API, not external dependencies or authentication providers.
const request = http.get({
  hostname: "127.0.0.1",
  port: process.env.PORT || 4000,
  path: "/api/health",
  agent: false
}, response => {
  response.resume();
  response.on("end", () => finish(response.statusCode === 200 ? 0 : 1));
  response.on("error", () => finish(1));
});

const deadline = setTimeout(() => finish(1), 2000);
request.on("error", () => finish(1));

function finish(code) {
  clearTimeout(deadline);
  request.destroy();
  process.exit(code);
}
