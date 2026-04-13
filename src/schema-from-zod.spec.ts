import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fromZodSchema } from "./schema-from-zod.js";
import { toZodSchema, validate } from "./schema-builder.js";

function assertSameValidation(
  a: z.ZodTypeAny,
  b: z.ZodTypeAny,
  samples: unknown[]
): void {
  for (const s of samples) {
    const ra = a.safeParse(s);
    const rb = b.safeParse(s);
    expect(ra.success).toBe(rb.success);
  }
}

describe("fromZodSchema", () => {
  it("builds a class whose toZodSchema matches a simple object schema", () => {
    const schema = z.object({
      name: z.string(),
      count: z.number(),
    });
    const Cls = fromZodSchema(schema, "Simple");
    const built = toZodSchema(Cls);
    assertSameValidation(built, schema, [
      { name: "a", count: 1 },
      { name: "", count: 0 },
      { name: "x", count: 2 },
      {},
      { name: "a" },
      { name: 1, count: 1 },
    ]);
  });

  it("unwraps optional, nullable, and default wrappers into FieldMeta", () => {
    const schema = z.object({
      a: z.string().optional(),
      b: z.number().nullable(),
      c: z.boolean().default(true),
    });
    const Cls = fromZodSchema(schema);
    const built = toZodSchema(Cls);
    assertSameValidation(built, schema, [
      { b: null },
      { a: "x", b: null, c: false },
      { b: 1 },
      { a: "y", b: 2, c: true },
    ]);
    expect(validate(Cls, { b: null })).toEqual({ b: null, c: true });
  });

  it("recursively handles nested z.object fields", () => {
    const schema = z.object({
      user: z.object({
        id: z.string().uuid(),
        tags: z.array(z.string()).min(1),
      }),
    });
    const Cls = fromZodSchema(schema, "Outer");
    const built = toZodSchema(Cls);
    const id = "550e8400-e29b-41d4-a716-446655440000";
    assertSameValidation(built, schema, [
      { user: { id, tags: ["a"] } },
      { user: { id: "bad", tags: ["a"] } },
      { user: { id, tags: [] } },
    ]);
  });

  it("preserves z.array field schemas", () => {
    const schema = z.object({
      items: z.array(z.number().int()).max(3),
    });
    const Cls = fromZodSchema(schema);
    const built = toZodSchema(Cls);
    assertSameValidation(built, schema, [
      { items: [1, 2] },
      { items: [1, 2, 3, 4] },
      { items: [1.5] },
    ]);
  });

  it("supports optional nested objects", () => {
    const schema = z.object({
      nested: z
        .object({
          x: z.string(),
        })
        .optional(),
    });
    const Cls = fromZodSchema(schema);
    const built = toZodSchema(Cls);
    assertSameValidation(built, schema, [
      {},
      { nested: { x: "a" } },
      { nested: { x: 1 } },
    ]);
  });
});
