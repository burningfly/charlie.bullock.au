import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../public/", import.meta.url));
const forbidden = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
    } else if (/\.(md|markdown|mdx)$/i.test(entry.name)) {
      forbidden.push(path);
    }
  }
}

await walk(root);
if (forbidden.length) {
  console.error("Markdown files must not be published from public/:");
  for (const path of forbidden) console.error(` - ${path}`);
  process.exitCode = 1;
} else {
  console.log("Publish check passed: no Markdown files in public/.");
}
