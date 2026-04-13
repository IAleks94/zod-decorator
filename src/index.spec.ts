import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { VERSION } from "./index.js";

const packageJsonPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "package.json"
);
const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
  version: string;
};

describe("index", () => {
  it("exports VERSION matching package.json", () => {
    expect(VERSION).toBe(pkg.version);
  });
});
