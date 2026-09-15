import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { get, request as httpRequest } from "node:http";
import { join } from "node:path";
import { createWebServer, listen, safeJoin } from "../src/web-server.js";
import { experimentRoot } from "../src/paths.js";

function request(port, path) {
  return new Promise((resolve, reject) => {
    get({ hostname: "127.0.0.1", port, path }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }),
      );
    }).on("error", reject);
  });
}

function post(port, path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = httpRequest(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }),
        );
      },
    );
    req.on("error", reject);
    req.end(payload);
  });
}

describe("web server", () => {
  it("rejects paths outside the web root", () => {
    const webRoot = join(experimentRoot(), "web");
    assert.equal(safeJoin(webRoot, "/../package.json"), null);
    assert.equal(safeJoin(webRoot, "/%2e%2e/package.json"), null);
  });

  it("serves the homepage and accepts a launch", async () => {
    const server = createWebServer({
      root: experimentRoot(),
      runLoop: async () => ({ ok: true, iterations: 1, runDir: "/tmp/rsi" }),
    });
    const addr = await listen(server, { port: 0, host: "127.0.0.1" });
    const port = addr.port;
    try {
      const home = await request(port, "/");
      assert.equal(home.status, 200);
      assert.match(home.body, /Recursive Self-Improvement/);
      const api = await request(port, "/api/site");
      const data = JSON.parse(api.body);
      assert.equal(api.status, 200);
      assert.equal(data.launch, true);
      assert.ok(data.tasks.some((t) => t.id === "retry-on-429"));
      const started = await post(port, "/api/run", { taskId: "retry-on-429" });
      assert.equal(started.status, 202);
      const blocked = await request(port, "/%2e%2e/package.json");
      assert.equal(blocked.status, 403);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
