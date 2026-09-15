# Lego

lurui 的个人 AI 实践仓库。一块一块搭，不追求一次做成产品。

想法和任务记在任务集：[lurui1997's Lego](https://github.com/users/lurui1997/projects/1)。

## 目录

```
docs/                 说明与索引
experiments/          独立实验，互不耦合
  weread-progress/    微信读书网页版阅读进度
  weread-highlights/  微信读书划线导出
```

每个实验自带 README：问题、做法、怎么跑。

## 进行中

| 实验 | 任务 | 状态 |
| --- | --- | --- |
| [weread-progress](experiments/weread-progress/README.md) | 网页书架展示「读完 / 已读到 x%」 | 可用油猴脚本 |
| [weread-highlights](experiments/weread-highlights/README.md) | 从 Obsidian 导出可读划线文本 | `npm run build` |

## 约定

- 一个实验一个目录，不往仓库根堆脚本。
- 外部任务以 [Project](https://github.com/users/lurui1997/projects/1) 为准；**新 issue 开在本仓 `lurui1997/Lego`**，不要开到 keel。实现也落本仓。
- 接口含义以一手文档为准，不靠字段名猜测。微信读书见 [Tencent/WeChatReading](https://github.com/Tencent/WeChatReading)。
