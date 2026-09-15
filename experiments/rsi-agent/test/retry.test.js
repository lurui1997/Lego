import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { complete } from "../src/llm.js";

function jsonRes(status, body) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("retry", () => {
  it("retries once on 429 then succeeds", async () => {
    let n = 0;
    const fetchImpl = async () => {
      n += 1;
      if (n === 1) return jsonRes(429, "rate limit");
      return jsonRes(200, {
        choices: [{ message: { role: "assistant", content: "ok" } }],
      });
    };
    const data = await complete({
      messages: [{ role: "user", content: "hi" }],
      apiKey: "x",
      baseUrl: "http://example.test/v1",
      model: "m",
      fetchImpl,
    });
    assert.equal(n, 2);
    assert.equal(data.choices[0].message.content, "ok");
  });
});
