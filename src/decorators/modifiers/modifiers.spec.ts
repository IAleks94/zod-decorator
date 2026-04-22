import "reflect-metadata";
import { z } from "zod";
import { describe, expect, it } from "vitest";
import {
  Default,
  IsNullable,
  IsOptional,
  Refine,
  Transform,
} from "./modifiers.js";
import { IsString } from "../string/string.js";
import { toZodSchema, validateSafe } from "../../schema-builder.js";
import { fromZodSchema } from "../../schema-from-zod.js";

describe("modifier decorators", () => {
  it("@IsOptional() allows undefined", () => {
    class C {
      @IsOptional()
      @IsString()
      s!: string | undefined;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({})).toEqual({});
    expect(schema.parse({ s: "x" })).toEqual({ s: "x" });
    expect(() => schema.parse({ s: null })).toThrow();
  });

  it("@IsOptional() after @IsString() merges correctly", () => {
    class C {
      @IsString()
      @IsOptional()
      s!: string | undefined;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({})).toEqual({});
    expect(schema.parse({ s: "x" })).toEqual({ s: "x" });
  });

  it("@IsNullable() allows null", () => {
    class C {
      @IsNullable()
      @IsString()
      s!: string | null;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ s: null })).toEqual({ s: null });
    expect(schema.parse({ s: "x" })).toEqual({ s: "x" });
  });

  it("@Default() applies when value missing", () => {
    class C {
      @Default("fallback")
      @IsString()
      s!: string;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({})).toEqual({ s: "fallback" });
    expect(schema.parse({ s: "hi" })).toEqual({ s: "hi" });
  });

  it("@Transform() maps parsed value", () => {
    class C {
      @Transform((v) => String(v).toUpperCase())
      @IsString()
      s!: string;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ s: "ab" })).toEqual({ s: "AB" });
  });

  it("@Refine() adds custom validation", () => {
    class C {
      @Refine((v) => v === "ok", { message: "must be ok" })
      @IsString()
      s!: string;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ s: "ok" })).toEqual({ s: "ok" });
    const bad = validateSafe(C, { s: "no" });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(bad.error.issues.some((i) => i.message.includes("must be ok"))).toBe(
        true
      );
    }
  });

  it("@Default(undefined) produces a ZodDefault with undefined default", () => {
    class C {
      @Default(undefined)
      @IsOptional()
      @IsString()
      s?: string;
    }
    const schema = toZodSchema(C);
    expect(schema.shape.s).toBeInstanceOf(z.ZodDefault);
    expect(schema.parse({})).toEqual({ s: undefined });
    expect(schema.parse({ s: "x" })).toEqual({ s: "x" });
  });

  it("subclass @IsOptional does not double-wrap a fromZodSchema default+optional field", () => {
    const baseSchema = z.object({
      a: z.string().optional().default("x"),
    });
    const Base = fromZodSchema(baseSchema, "OptDefaultBase");

    class Extended extends Base {
      @IsOptional()
      a?: string;
    }

    const rebuilt = toZodSchema(Extended);
    // Before the fix, the outer `ZodDefault` bypassed the `instanceof ZodOptional` guard and an
    // extra `.optional()` was appended on top of the existing `ZodDefault(ZodOptional(...))`.
    const fieldSchema = rebuilt.shape.a;
    expect(fieldSchema).toBeInstanceOf(z.ZodDefault);
    // The default must still fire on `{}` (would be lost if wrapped again as `ZodOptional(ZodDefault(...))`
    // because the outer optional short-circuits to `undefined`).
    expect(rebuilt.parse({})).toEqual({ a: "x" });
    expect(rebuilt.parse({ a: "y" })).toEqual({ a: "y" });
  });

  it("composes optional + nullable + default", () => {
    class C {
      @IsOptional()
      @IsNullable()
      @Default("x")
      @IsString()
      s!: string | null | undefined;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({})).toEqual({ s: "x" });
    expect(schema.parse({ s: null })).toEqual({ s: null });
    expect(schema.parse({ s: "y" })).toEqual({ s: "y" });
  });
});
