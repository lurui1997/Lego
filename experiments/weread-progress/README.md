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

1. 打开 [篡改猴详情](chrome://extensions/?id=dhdgffkkebhmkfjojejmpbldmpobfkfo)
2. 打开 **允许用户脚本**
3. 安装脚本（任选其一）：
   - 打开 [GitHub 源文件](https://raw.githubusercontent.com/lurui1997/Lego/main/experiments/weread-progress/src/weread-progress.user.js)，点「安装」
   - 或把 [`src/weread-progress.user.js`](src/weread-progress.user.js) 粘进 Tampermonkey 新建脚本
4. 打开已登录的 [书架](https://weread.qq.com/web/shelf) 或书单页

脚本只读当前登录态下的同域接口，不上传账号。

## 自测

```sh
npm test
```
