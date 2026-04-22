import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");
const distNestIndex = join(root, "dist/nest/index.js");
const hasDistNest = existsSync(distNestIndex);

describe("subpath export (package.json)", () => {
  it("exports map and typesVersions for root and ./nest", async () => {
    const raw = await readFile(join(root, "package.json"), "utf-8");
    const pkg = JSON.parse(raw) as {
      exports: Record<string, { import: string; types: string }>;
      typesVersions: { "*": { nest: string[] } };
    };
    expect(pkg.exports["."].import).toBe("./dist/index.js");
    expect(pkg.exports["."].types).toBe("./dist/index.d.ts");
    expect(pkg.exports["./nest"].import).toBe("./dist/nest/index.js");
    expect(pkg.exports["./nest"].types).toBe("./dist/nest/index.d.ts");
    expect(pkg.typesVersions["*"].nest[0]).toBe("./dist/nest/index.d.ts");
  });
});

describe.skipIf(!hasDistNest)("subpath export (built dist)", () => {
  it("dynamic import of built nest barrel exposes ZodValidationPipe and plainToInstance", async () => {
    const mod = await import("../../dist/nest/index.js");
    expect(typeof mod.ZodValidationPipe).toBe("function");
    expect(mod.ZodValidationPipe.prototype).toBeDefined();
    expect(typeof mod.plainToInstance).toBe("function");
    expect(typeof mod.redactZodIssuesForResponse).toBe("function");
  });
});
