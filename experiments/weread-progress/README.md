# 微信读书网页版进度

对应任务：[Weread Progress Bar](https://github.com/users/lurui1997/projects/1/views/1?pane=issue&itemId=246114975&issue=lurui1997%7Ckeel%7C1)。

微信读书网页版书架 / 书单不展示 App 上的阅读状态。网页端其实已经从 `/web/shelf/sync` 拿到 `progress` 和 `finishReading`，但封面下的 `infoString` 被写成空字符串。

本实验用油猴脚本把这些字段画回封面：

- **读完**：`progress === 100`，或书架 `finishReading === 1`
- **已读到 x%**：`progress` 为 1–99（`1` 表示 1%，不是 100%）
- **未开始**：`progress === 0` 且未标记读完

口径对齐 [官方 Skill](https://github.com/Tencent/WeChatReading/blob/main/skills/book.md)。

## 安装

Chrome 已装 Tampermonkey（v5.5.0）。Chrome 138+ 必须先打开扩展详情里的 **允许用户脚本**，否则仪表盘会提示「没有安装任何脚本」。

微信读书 CSP 的 `script-src` 不含 `blob:`。脚本用 `@inject-into content` 和 `@grant GM_addStyle` 走扩展隔离世界，避免被页面 CSP 拦掉。

1. 打开 [篡改猴详情](chrome://extensions/?id=dhdgffkkebhmkfjojejmpbldmpobfkfo)
2. 打开 **允许用户脚本**
3. 安装脚本（任选其一）：
   - 打开 [GitHub 源文件](https://raw.githubusercontent.com/lurui1997/Lego/main/experiments/weread-progress/src/weread-progress.user.js)，点「安装」
   - 或把 [`src/weread-progress.user.js`](src/weread-progress.user.js) 粘进 Tampermonkey 新建脚本
4. 打开已登录的 [书架](https://weread.qq.com/web/shelf) 或书单页

脚本只读当前登录态下的同域接口，不上传账号。

开源仓库与安装入口：[lurui1997/weread-progress](https://github.com/lurui1997/weread-progress)。

## AI 安装

把下面整段发给 Cursor / Claude / ChatGPT 等能操作本机浏览器的助手：

```
帮我在本机 Chrome 安装微信读书书架进度油猴脚本。

1. 确认已安装 Tampermonkey。没有就先装：https://www.tampermonkey.net/
2. Chrome 138+：打开 chrome://extensions/?id=dhdgffkkebhmkfjojejmpbldmpobfkfo ，打开「允许用户脚本」或「允许运行用户脚本」。
3. 用油猴安装这个地址（打开后点安装；已装过就更新到最新）：
   https://raw.githubusercontent.com/lurui1997/weread-progress/main/src/weread-progress.user.js
4. 仪表盘里确认「微信读书书架进度」已启用，版本至少 0.1.3。
5. 打开已登录的 https://weread.qq.com/web/shelf 或某个书单封面墙，封面上应出现「读完 / 已读到 x% / 未开始」。
6. 没有进度条：完全退出 Chrome（macOS 用 Cmd+Q）再打开书架。不要只关窗口。

脚本只读当前登录态下的同域接口，不上传账号。非官方，与腾讯 / 微信读书无关。
```

助手装完后，自己打开书架看一眼封面即可。

## 使用指南

1. 用 Chrome 打开已登录的 [微信读书网页版](https://weread.qq.com/web/shelf)。
2. 进**书架**或某个**书单**（封面墙那一页）。首页、阅读器内页不会画进度。
3. 每本书封面上会多一行状态：
   - **读完**：整本读完，或书架标记了读完
   - **已读到 x%**：读过但没读完；`1` 就是 1%，不是 100%
   - **未开始**：还没打开读过
4. 换书单、滚动加载更多封面后，进度会再刷一遍。没有的话整页刷新一次。
5. 进度跟 App 同一套登录态，换账号后刷新页面即可。

封面数据来自当前登录态下的 `/web/shelf/sync`，不改书架、不上传账号。

油猴里关掉再打开脚本后仍没有进度条时：

1. 打开 [篡改猴详情](chrome://extensions/?id=dhdgffkkebhmkfjojejmpbldmpobfkfo)，确认 **允许运行用户脚本** 是开的
2. 完全退出 Chrome（`Cmd+Q`）再打开，重新进书架
3. 仪表盘里确认「微信读书书架进度」已启用，版本至少 **0.1.3**

## 自测

```sh
npm test
```
