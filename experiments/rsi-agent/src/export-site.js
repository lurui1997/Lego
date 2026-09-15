import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { experimentRoot } from "./paths.js";
import { loadSitePayload } from "./web-data.js";

export async function exportSite(root = experimentRoot()) {
  const payload = await loadSitePayload(root);
  const dir = join(root, "web", "data");
  await mkdir(dir, { recursive: true });
  const dest = join(dir, "site.json");
  await writeFile(dest, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return dest;
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  exportSite()
    .then((dest) => {
      process.stdout.write(`wrote ${dest}\n`);
    })
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    });
}
