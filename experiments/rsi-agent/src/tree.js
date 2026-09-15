import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const SKIP = new Set(["state", "node_modules", ".git", "web"]);

export async function listTree(root, dir = root, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) await listTree(root, abs, acc);
    else acc.push(relative(root, abs));
  }
  return acc.sort();
}
