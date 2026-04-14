import { readFileSync, writeFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf-8"));
const indexPath = "src/index.ts";
const source = readFileSync(indexPath, "utf-8");
const updated = source.replace(
  /export const VERSION = ".*?"/,
  `export const VERSION = "${version}"`,
);

if (source === updated) {
  console.log(`VERSION already ${version}`);
} else {
  writeFileSync(indexPath, updated);
  console.log(`VERSION synced to ${version}`);
}
