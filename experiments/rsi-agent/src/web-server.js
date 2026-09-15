import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { experimentRoot } from "./paths.js";
import { loadSitePayload } from "./web-data.js";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(payload);
}

export function safeJoin(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }
  const abs = resolve(root, `.${decoded}`);
  const rel = relative(root, abs);
  if (rel.startsWith(`..${sep}`) || rel === "..") return null;
  return abs;
}

export function createWebServer({ root = experimentRoot() } = {}) {
  const webRoot = join(root, "web");
  return createServer(async (req, res) => {
    try {
      const pathname = (req.url || "/").split("?")[0] || "/";
      if (req.method !== "GET" && req.method !== "HEAD") {
        send(res, 405, "Method Not Allowed", { "Content-Type": "text/plain; charset=utf-8" });
        return;
      }
      if (pathname === "/api/site") {
        const payload = await loadSitePayload(root);
        send(res, 200, payload, { "Content-Type": "application/json; charset=utf-8" });
        return;
      }
      const path = pathname === "/" ? "/index.html" : pathname;
      const file = safeJoin(webRoot, path);
      if (!file) {
        send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
        return;
      }
      const info = await stat(file);
      if (!info.isFile()) {
        send(res, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
        return;
      }
      const type = MIME[extname(file)] || "application/octet-stream";
      const buf = await readFile(file);
      send(res, 200, buf, { "Content-Type": type });
    } catch (err) {
      if (err && err.code === "ENOENT") {
        send(res, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
        return;
      }
      send(res, 500, "Internal Server Error", { "Content-Type": "text/plain; charset=utf-8" });
    }
  });
}

export function listen(server, { port = 0, host = "127.0.0.1" } = {}) {
  return new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolveListen(server.address());
    });
  });
}

const isCli =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const port = Number(process.env.RSI_WEB_PORT || 3847);
  const host = process.env.RSI_WEB_HOST || "127.0.0.1";
  const server = createWebServer();
  listen(server, { port, host })
    .then((addr) => {
      const actualPort = typeof addr === "object" && addr ? addr.port : port;
      process.stdout.write(`RSI 前端 http://${host}:${actualPort}/\n`);
    })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    });
}
