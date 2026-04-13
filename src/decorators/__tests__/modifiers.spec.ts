import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { toZodSchema } from "../../schema-builder.js";
import {
  Default,
  IsNullable,
  IsOptional,
  IsString,
  Refine,
  Transform,
} from "../index.js";

describe("modifier decorators", () => {
  it("@IsOptional allows omitting the property", () => {
    class T {
      @IsOptional()
      @IsString()
      s?: string;
    }
    const schema = toZodSchema(T);
    expect(schema.parse({})).toEqual({});
    expect(schema.parse({ s: "x" })).toEqual({ s: "x" });
  });

  it("@IsNullable allows null", () => {
    class T {
      @IsNullable()
      @IsString()
      s!: string | null;
    }
    const schema = toZodSchema(T);
    expect(schema.parse({ s: null })).toEqual({ s: null });
    expect(schema.parse({ s: "a" })).toEqual({ s: "a" });
  });

  it("@Default supplies a value when the key is missing", () => {
    class T {
      @Default("fallback")
      @IsString()
      s!: string;
    }
    const schema = toZodSchema(T);
    expect(schema.parse({})).toEqual({ s: "fallback" });
    expect(schema.parse({ s: "hi" })).toEqual({ s: "hi" });
  });

  it("@Transform maps the parsed value", () => {
    class T {
      @Transform((v) => (typeof v === "string" ? v.toUpperCase() : v))
      @IsString()
      s!: string;
    }
    const schema = toZodSchema(T);
    expect(schema.parse({ s: "ab" })).toEqual({ s: "AB" });
  });

  it("@Refine rejects when the check is falsy", () => {
    class T {
      @Refine((v) => v === "ok")
      @IsString()
      s!: string;
    }
    const schema = toZodSchema(T);
    expect(schema.parse({ s: "ok" })).toEqual({ s: "ok" });
    expect(() => schema.parse({ s: "no" })).toThrow();
  });

  it("@Refine uses a custom message when provided", () => {
    class T {
      @Refine((v) => v === "ok", { message: "must be ok" })
      @IsString()
      s!: string;
    }
    const schema = toZodSchema(T);
    const r = schema.safeParse({ s: "no" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe("must be ok");
    }
  });

  it("merges multiple @Transform calls in order", () => {
    class T {
      @Transform((v) => (typeof v === "string" ? v.trim() : v))
      @Transform((v) => (typeof v === "string" ? v.toLowerCase() : v))
      @IsString()
      s!: string;
    }
    const schema = toZodSchema(T);
    expect(schema.parse({ s: "  HELLO  " })).toEqual({ s: "hello" });
  });
});
