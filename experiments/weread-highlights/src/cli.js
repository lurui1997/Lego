import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bookHasContent, parseBook } from "./parse.js";
import { formatCorpus, sortBooks } from "./format.js";

const DEFAULT_DIR = "/Users/drulu/Documents/claude-obsidian-vault/Books/Weread";
const DEFAULT_OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../out/highlights.md");

function parseArgs(argv) {
  const args = { dir: DEFAULT_DIR, out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--dir") args.dir = resolve(argv[++i] ?? "");
    else if (flag === "--out") args.out = resolve(argv[++i] ?? "");
    else if (flag === "--help" || flag === "-h") args.help = true;
    else throw new Error(`未知参数：${flag}`);
  }
  return args;
}

export async function collectBooks(dir) {
  const names = (await readdir(dir)).filter((name) => name.endsWith(".md")).sort();
  const books = [];
  for (const name of names) {
    const raw = await readFile(join(dir, name), "utf8");
    const book = parseBook(raw, name);
    if (bookHasContent(book)) books.push(book);
  }
  return sortBooks(books);
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(
      "用法：node src/cli.js [--dir <vault>] [--out <file>]\n",
    );
    return;
  }
  const books = await collectBooks(args.dir);
  const text = formatCorpus(books, {
    sourceDir: args.dir,
    generatedAt: new Date().toISOString().slice(0, 10),
  });
  await mkdir(dirname(args.out), { recursive: true });
  await writeFile(args.out, text, "utf8");
  process.stdout.write(`写了 ${books.length} 本 → ${args.out}\n`);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
