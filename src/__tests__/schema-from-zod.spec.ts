import "reflect-metadata";
import { z } from "zod";
import { describe, expect, it } from "vitest";
import { IsNullable, IsString } from "../decorators/index.js";
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
  it("preserves strict unknownKeys on roundtrip", () => {
    const original = z
      .object({
        a: z.string(),
      })
      .strict();
    const Cls = fromZodSchema(original, "StrictOuter");
    const rebuilt = toZodSchema(Cls);
    expectEquivalentObjectParse(original, rebuilt, [
      { a: "x" },
      { a: "x", extra: 1 },
    ]);
  });

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

  it("preserves optional vs default wrapper order on roundtrip", () => {
    const defThenOpt = z.object({
      a: z.string().default("x").optional(),
    });
    const optThenDef = z.object({
      b: z.string().optional().default("x"),
    });
    const rebuiltDO = toZodSchema(fromZodSchema(defThenOpt, "DO"));
    const rebuiltOD = toZodSchema(fromZodSchema(optThenDef, "OD"));
    expectEquivalentObjectParse(defThenOpt, rebuiltDO, [
      {},
      { a: undefined },
      { a: "y" },
    ]);
    expectEquivalentObjectParse(optThenDef, rebuiltOD, [
      {},
      { b: undefined },
      { b: "y" },
    ]);
  });

  it("preserves dynamic default factories across roundtrip", () => {
    let n = 0;
    const original = z.object({
      id: z.string().default(() => String(++n)),
    });
    const Cls = fromZodSchema(original, "DynId");
    const rebuilt = toZodSchema(Cls);
    const r1 = rebuilt.parse({});
    const r2 = rebuilt.parse({});
    expect(r1.id).not.toBe(r2.id);
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

  it("matches validation for simple object (success and failure cases)", () => {
    const original = z.object({
      name: z.string(),
      count: z.number(),
    });
    const Cls = fromZodSchema(original, "Simple");
    const rebuilt = toZodSchema(Cls);
    expectEquivalentObjectParse(original, rebuilt, [
      { name: "a", count: 1 },
      { name: "", count: 0 },
      { name: "x", count: 2 },
      {},
      { name: "a" },
      { name: 1, count: 1 },
    ]);
  });

  it("nested z.object fields preserve inner constraints", () => {
    const original = z.object({
      user: z.object({
        id: z.string().uuid(),
        tags: z.array(z.string()).min(1),
      }),
    });
    const Cls = fromZodSchema(original, "Outer");
    const rebuilt = toZodSchema(Cls);
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expectEquivalentObjectParse(original, rebuilt, [
      { user: { id, tags: ["a"] } },
      { user: { id: "bad", tags: ["a"] } },
      { user: { id, tags: [] } },
    ]);
  });

  it("preserves z.array field schemas", () => {
    const original = z.object({
      items: z.array(z.number().int()).max(3),
    });
    const Cls = fromZodSchema(original);
    const rebuilt = toZodSchema(Cls);
    expectEquivalentObjectParse(original, rebuilt, [
      { items: [1, 2] },
      { items: [1, 2, 3, 4] },
      { items: [1.5] },
    ]);
  });

  it("optional nested objects roundtrip", () => {
    const original = z.object({
      nested: z
        .object({
          x: z.string(),
        })
        .optional(),
    });
    const Cls = fromZodSchema(original);
    const rebuilt = toZodSchema(Cls);
    expectEquivalentObjectParse(original, rebuilt, [
      {},
      { nested: { x: "a" } },
      { nested: { x: 1 } },
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

  it("merged modifiers on fromZodSchema fields apply after wrapperChain", () => {
    const baseSchema = z.object({
      a: z.string().optional(),
    });
    const Base = fromZodSchema(baseSchema, "MergeWrappers");

    class Extended extends Base {
      @IsNullable()
      a?: string;
    }

    const rebuilt = toZodSchema(Extended);
    expect(rebuilt.parse({ a: null })).toEqual({ a: null });
    expect(rebuilt.parse({})).toEqual({});
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

  it("sanitizes dynamic class names from name argument", () => {
    const original = z.object({ x: z.string() });
    const Cls = fromZodSchema(original, "weird-name!");
    expect(Cls.name).toBe("weird_name_");
    const rebuilt = toZodSchema(Cls);
    expect(rebuilt.parse({ x: "a" })).toEqual({ x: "a" });
  });
});
