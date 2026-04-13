import "reflect-metadata";
import { describe, expect, it } from "vitest";
import {
  Default,
  IsNullable,
  IsOptional,
  Refine,
  Transform,
} from "../modifiers.js";
import { IsString } from "../string.js";
import { toZodSchema, validateSafe } from "../../schema-builder.js";

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
