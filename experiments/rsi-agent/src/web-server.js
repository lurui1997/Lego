import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { experimentRoot } from "./paths.js";
import { loadSitePayload } from "./web-data.js";
import { createJobRunner } from "./launch.js";
import { runLoop } from "./loop.js";

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

function readJson(req, limit = 64_000) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let n = 0;
    req.on("data", (chunk) => {
      n += chunk.length;
      if (n > limit) {
        const err = new Error("请求体过大");
        err.status = 413;
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) {
        resolveBody({});
        return;
      }
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        const err = new Error("JSON 无效");
        err.status = 400;
        reject(err);
      }
    });
    req.on("error", reject);
  });
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

export function createWebServer({
  root = experimentRoot(),
  runLoop: runLoopImpl = runLoop,
} = {}) {
  const webRoot = join(root, "web");
  const jobs = createJobRunner({ root, runLoop: runLoopImpl });
  return createServer(async (req, res) => {
    try {
      const pathname = (req.url || "/").split("?")[0] || "/";
      if (req.method === "POST" && pathname === "/api/run") {
        const body = await readJson(req);
        const job = await jobs.start(body);
        send(res, 202, job, { "Content-Type": "application/json; charset=utf-8" });
        return;
      }
      if (req.method !== "GET" && req.method !== "HEAD") {
        send(res, 405, "Method Not Allowed", { "Content-Type": "text/plain; charset=utf-8" });
        return;
      }
      if (pathname === "/api/site") {
        const payload = await loadSitePayload(root);
        payload.launch = true;
        payload.job = jobs.snapshot();
        send(res, 200, payload, { "Content-Type": "application/json; charset=utf-8" });
        return;
      }
      if (pathname === "/api/job") {
        send(res, 200, jobs.snapshot(), { "Content-Type": "application/json; charset=utf-8" });
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
      const status = Number(err?.status) || (err && err.code === "ENOENT" ? 404 : 500);
      if (status === 404) {
        send(res, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
        return;
      }
      const message = err instanceof Error ? err.message : "Internal Server Error";
      send(res, status >= 400 && status < 600 ? status : 500, { error: message }, {
        "Content-Type": "application/json; charset=utf-8",
      });
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
