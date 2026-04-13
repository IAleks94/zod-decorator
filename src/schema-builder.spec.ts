import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { IsOptional, IsString } from "./decorators/index.js";
import { Schema } from "./decorators/schema.js";
import { toZodSchema, validate, validateSafe } from "./schema-builder.js";

describe("schema-builder", () => {
  it("toZodSchema builds an object schema from decorated fields", () => {
    @Schema()
    class User {
      @IsString()
      name!: string;
    }
    const schema = toZodSchema(User);
    expect(schema.parse({ name: "a" })).toEqual({ name: "a" });
    expect(() => schema.parse({ name: 1 })).toThrow();
  });

  it("validate parses valid data and returns the result", () => {
    @Schema()
    class User {
      @IsOptional()
      @IsString()
      name?: string;
    }
    expect(validate(User, { name: "x" })).toEqual({ name: "x" });
    expect(validate(User, {})).toEqual({});
  });

  it("validate throws on invalid data", () => {
    @Schema()
    class User {
      @IsString()
      name!: string;
    }
    expect(() => validate(User, { name: 1 })).toThrow();
  });

  it("validateSafe returns success for valid data", () => {
    @Schema()
    class User {
      @IsString()
      name!: string;
    }
    const r = validateSafe(User, { name: "ok" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual({ name: "ok" });
    }
  });

  it("validateSafe returns error for invalid data", () => {
    @Schema()
    class User {
      @IsString()
      name!: string;
    }
    const r = validateSafe(User, { name: 1 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.length).toBeGreaterThan(0);
    }
  });
});
