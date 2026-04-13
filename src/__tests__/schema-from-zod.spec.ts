import "reflect-metadata";
import { z } from "zod";
import { describe, expect, it } from "vitest";
import { IsString } from "../decorators/index.js";
import { fromZodSchema } from "../schema-from-zod.js";
import { toZodSchema, validate } from "../schema-builder.js";

function expectEquivalentObjectParse(
  original: z.ZodObject<z.ZodRawShape>,
  rebuilt: z.ZodObject<z.ZodRawShape>,
  cases: unknown[]
) {
  for (const data of cases) {
    const a = original.safeParse(data);
    const b = rebuilt.safeParse(data);
    expect(a.success).toBe(b.success);
    if (a.success && b.success) {
      expect(a.data).toEqual(b.data);
    }
  }
}

describe("fromZodSchema", () => {
  it("roundtrip: toZodSchema(fromZodSchema(schema)) matches validation", () => {
    const original = z.object({
      a: z.string(),
      b: z.number(),
    });
    const cases = [
      { a: "x", b: 1 },
      {},
      { a: "x" },
      { a: "x", b: "nope" },
      null,
    ];

    const Cls = fromZodSchema(original, "Roundtrip");
    const rebuilt = toZodSchema(Cls);
    expectEquivalentObjectParse(original, rebuilt, cases);
  });

  it("unwraps optional, nullable, and default wrappers", () => {
    const original = z.object({
      opt: z.string().optional(),
      nul: z.string().nullable(),
      def: z.string().default("fallback"),
    });
    const Cls = fromZodSchema(original, "Unwrap");
    const rebuilt = toZodSchema(Cls);

    expectEquivalentObjectParse(original, rebuilt, [
      { opt: "a", nul: "b", def: "c" },
      { nul: null, def: "x" },
      { nul: null },
      {},
    ]);
  });

  it("nested object roundtrip preserves nested validation", () => {
    const original = z.object({
      user: z.object({
        id: z.string().min(2),
        score: z.number().int(),
      }),
    });
    const Cls = fromZodSchema(original, "NestedRoundtrip");
    const rebuilt = toZodSchema(Cls);

    expectEquivalentObjectParse(original, rebuilt, [
      { user: { id: "ab", score: 1 } },
      { user: { id: "a", score: 1 } },
      { user: { id: "ab", score: 1.5 } },
      {},
    ]);
  });

  it("extending a fromZodSchema class with decorators merges fields", () => {
    const baseSchema = z.object({
      id: z.string(),
    });
    const Base = fromZodSchema(baseSchema, "DynBase");

    class Extended extends Base {
      @IsString()
      extra!: string;
    }

    const schema = toZodSchema(Extended);
    expect(schema.parse({ id: "1", extra: "more" })).toEqual({
      id: "1",
      extra: "more",
    });
    expect(() => schema.parse({ id: "1" })).toThrow();

    expect(validate(Extended, { id: "1", extra: "more" })).toEqual({
      id: "1",
      extra: "more",
    });
  });
});
