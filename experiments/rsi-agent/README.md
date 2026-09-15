# RSI Agent

对应任务：[Recursive Self-Improvement(RSI) Agent](https://github.com/lurui1997/Lego/issues/3)。

人写任务、验收命令、迭代次数和间隔。CLI 在本目录里循环：调本机 [Cursor CLI](https://cursor.com/docs/cli) `agent` → 允许改自己的 runner/提示/工具 → 冒烟 → 跑**冻结**验收。搞挂入口就 git 回滚。

需要已登录：`agent status`。

## 用法

```sh
# 可选
export RSI_CURSOR_BIN=agent          # 或 cursor-agent 的绝对路径
export RSI_MODEL=                     # 传给 agent --model
export RSI_CURSOR_TIMEOUT_MS=600000

npm test
node src/cli.js run tasks/retry-on-429
```

每轮等价于：

```sh
agent --print --trust --force --sandbox disabled --workspace <本实验根> --output-format text "<本轮提示>"
```

`npm test` 不打真 Agent。第一道任务的验收是 `node --test test/retry.test.js`：当前 `src/llm.js` **没有** 429 重试，这条会失败，要靠 Cursor Agent 改代码才过。

## 任务文件

`tasks/<name>/task.json`：

```json
{
  "goal": "LLM 返回 429 时自动重试一次再失败",
  "acceptance": "node --test test/retry.test.js",
  "max_iterations": 5,
  "interval_seconds": 0
}
```

启动时把 `acceptance` 抄进 `state/<run>/acceptance.txt`，整次 run 只执行这份副本。`interval_seconds` 是同进程 sleep，不是 cron。

## 边界

- 可改：`src/`、`prompts/`、`test/`。
- 不可改：当次冻结验收文件。
- 每轮冒烟：`node --check src/cli.js` 和 `node src/cli.js --help`。失败则回滚到上一份冒烟通过的快照。
- 快照用独立 `GIT_DIR`，不往 Lego 仓库提交。
- 不自动 push。
