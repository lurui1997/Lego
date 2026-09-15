export function defaultConfig() {
  return {
    apiKey: process.env.RSI_API_KEY ?? "",
    baseUrl: (process.env.RSI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.RSI_MODEL ?? "gpt-4.1",
  };
}

export async function complete({
  messages,
  tools,
  apiKey,
  baseUrl,
  model,
  fetchImpl = globalThis.fetch,
}) {
  const body = JSON.stringify({
    model,
    messages,
    tools,
    tool_choice: tools?.length ? "auto" : undefined,
  });
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  const url = `${baseUrl}/chat/completions`;

  let res = await fetchImpl(url, { method: "POST", headers, body });
  if (res.status === 429) {
    res = await fetchImpl(url, { method: "POST", headers, body });
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM ${res.status}: ${text}`);
  }
  return res.json();
}

export async function runToolLoop({
  messages,
  tools,
  execTool,
  apiKey,
  baseUrl,
  model,
  fetchImpl = globalThis.fetch,
  maxSteps = 20,
}) {
  const trail = messages;
  for (let step = 0; step < maxSteps; step += 1) {
    const data = await complete({
      messages: trail,
      tools,
      apiKey,
      baseUrl,
      model,
      fetchImpl,
    });
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error("LLM 空响应");
    trail.push(msg);
    const calls = msg.tool_calls ?? [];
    if (!calls.length) return msg;
    for (const call of calls) {
      let args = {};
      try {
        args = JSON.parse(call.function?.arguments || "{}");
      } catch {
        args = {};
      }
      const content = await execTool(call.function?.name, args);
      trail.push({
        role: "tool",
        tool_call_id: call.id,
        content: String(content),
      });
    }
  }
  throw new Error("tool step limit");
}
