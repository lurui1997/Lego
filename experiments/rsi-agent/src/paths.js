import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export function experimentRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

export function resolveInside(root, relPath) {
  const base = resolve(root);
  const abs = resolve(base, relPath);
  const rel = relative(base, abs);
  if (rel.startsWith(`..${sep}`) || rel === "..") {
    throw new Error(`路径越界：${relPath}`);
  }
  return abs;
}

export function acceptanceFile(runDir) {
  return join(resolve(runDir), "acceptance.txt");
}

export function assertWritable(root, runDir, absPath) {
  const abs = resolve(absPath);
  if (abs === acceptanceFile(runDir)) {
    throw new Error("禁止改冻结验收");
  }
  resolveInside(root, relative(resolve(root), abs));
  return abs;
}
