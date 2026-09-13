# 微信读书划线导出

对应任务：[Weread Highlights Export](https://github.com/users/lurui1997/projects/1/views/1?pane=issue&issue=lurui1997%7Ckeel%7C3)（[keel#3](https://github.com/lurui1997/keel/issues/3)）。

读 Obsidian 里 [obsidian-weread-plugin](https://github.com/zhaohongxuan/obsidian-weread-plugin) 同步下来的书笔记，去掉封面、`weread://` 链接和重复的「读书笔记」块，收成一份人和模型都能扫的文本。

默认读：

`/Users/drulu/Documents/claude-obsidian-vault/Books/Weread`

## 用法

```sh
npm test
npm run build
```

写出 `out/highlights.md`。换目录或换落点：

```sh
node src/cli.js --dir /path/to/Weread --out /tmp/highlights.md
```

有划线、想法或非空书评的书才会进文件。同一条想法只保留「高亮划线」里那一次。
