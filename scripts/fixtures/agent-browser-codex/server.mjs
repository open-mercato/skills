import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const body = readFileSync(new URL("./index.html", import.meta.url));
const server = createServer((request, response) => {
  if (request.url === "/" || request.url === "/index.html") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(body);
    return;
  }
  response.writeHead(404, { "content-type": "text/plain" });
  response.end("not found");
});

server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  console.log(`FIXTURE_URL=http://127.0.0.1:${address.port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
