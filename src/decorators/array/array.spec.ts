import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { IsArray } from "./array.js";
import { IsString } from "../string/string.js";
import { getFields } from "../../metadata.js";
import { toZodSchema } from "../../schema-builder.js";

describe("@IsArray()", () => {
  it("defaults items to z.unknown()", () => {
    class C {
      @IsArray()
      a!: unknown[];
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ a: [1, "x", {}] })).toEqual({ a: [1, "x", {}] });
    expect(() => schema.parse({ a: "nope" })).toThrow();
  });

  it("uses items factory for element typing", () => {
    class C {
      @IsArray({ items: () => z.string() })
      a!: string[];
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ a: ["x", "y"] })).toEqual({ a: ["x", "y"] });
    expect(() => schema.parse({ a: [1] })).toThrow();
  });

  it("uses elementClass for element typing and registers elementClass metadata", () => {
    class Item {
      @IsString()
      id!: string;
    }
    class C {
      @IsArray({ elementClass: () => Item })
      a!: Item[];
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ a: [{ id: "x" }] })).toEqual({ a: [{ id: "x" }] });
    expect(() => schema.parse({ a: [{ id: 1 }] })).toThrow();
    const meta = getFields(C).find((f) => f.propertyKey === "a")!;
    expect(meta.elementClass).toBeDefined();
    expect(meta.elementClass!()).toBe(Item);
  });

  it("ignores elementClass metadata when items is set (items is the single source of truth)", () => {
    class Item {
      @IsString()
      id!: string;
    }
    class C {
      @IsArray({ items: () => z.string(), elementClass: () => Item })
      a!: string[];
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ a: ["x"] })).toEqual({ a: ["x"] });
    expect(() => schema.parse({ a: [{}] })).toThrow();
    expect(getFields(C).find((f) => f.propertyKey === "a")!.elementClass).toBeUndefined();
  });

  it("enforces min and max length", () => {
    class C {
      @IsArray({ min: 2, max: 3 })
      a!: unknown[];
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ a: [1, 2] })).toEqual({ a: [1, 2] });
    expect(schema.parse({ a: [1, 2, 3] })).toEqual({ a: [1, 2, 3] });
    expect(() => schema.parse({ a: [1] })).toThrow();
    expect(() => schema.parse({ a: [1, 2, 3, 4] })).toThrow();
  });

  it("enforces nonempty", () => {
    class C {
      @IsArray({ nonempty: true })
      a!: unknown[];
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ a: [1] })).toEqual({ a: [1] });
    expect(() => schema.parse({ a: [] })).toThrow();
  });
});

describe("@IsArray() message", () => {
  it("uses string message as base type error", () => {
    class C {
      @IsArray({ message: "not an array" })
      a!: unknown[];
    }
    expect(() => toZodSchema(C).parse({ a: "nope" })).toThrow("not an array");
  });

  it("applies per-constraint messages", () => {
    class C {
      @IsArray({
        min: 2,
        max: 3,
        message: { min: "need at least 2", max: "at most 3" },
      })
      a!: unknown[];
    }
    const schema = toZodSchema(C);
    expect(() => schema.parse({ a: [1] })).toThrow("need at least 2");
    expect(() => schema.parse({ a: [1, 2, 3, 4] })).toThrow("at most 3");
  });

  it("applies nonempty message", () => {
    class C {
      @IsArray({ nonempty: true, message: { nonempty: "cannot be empty" } })
      a!: unknown[];
    }
    expect(() => toZodSchema(C).parse({ a: [] })).toThrow("cannot be empty");
  });

  it("uses base in object message for type error alongside constraint messages", () => {
    class C {
      @IsArray({
        min: 2,
        message: { base: "must be an array", min: "need at least 2" },
      })
      a!: unknown[];
    }
    const schema = toZodSchema(C);
    expect(() => schema.parse({ a: "nope" })).toThrow("must be an array");
    expect(() => schema.parse({ a: [1] })).toThrow("need at least 2");
  });
});
