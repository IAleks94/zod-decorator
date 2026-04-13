import "reflect-metadata";
import { z } from "zod";
import { describe, expect, it } from "vitest";
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Nested,
} from "../decorators/index.js";
import { toZodSchema, validate, validateSafe } from "../schema-builder.js";

describe("schema-builder integration", () => {
  class Address {
    @IsString()
    street!: string;
  }

  class Profile {
    @IsString()
    name!: string;

    @IsOptional()
    @IsNumber({ int: true, nonnegative: true })
    age?: number;

    @Nested(() => Address)
    address!: Address;

    @IsArray({ items: () => z.string(), min: 1 })
    tags!: string[];
  }

  const valid = {
    name: "Ada",
    age: 30,
    address: { street: "1 Main St" },
    tags: ["a", "b"],
  };

  it("toZodSchema builds a schema that validates nested and array fields", () => {
    const schema = toZodSchema(Profile);
    expect(schema.shape).toHaveProperty("name");
    expect(schema.shape).toHaveProperty("age");
    expect(schema.shape).toHaveProperty("address");
    expect(schema.shape).toHaveProperty("tags");

    const parsed = schema.parse(valid);
    expect(parsed).toEqual(valid);
  });

  it("validate parses valid data and rejects invalid data", () => {
    expect(validate(Profile, valid)).toEqual(valid);

    expect(() =>
      validate(Profile, {
        ...valid,
        name: 123,
      })
    ).toThrow();

    expect(() =>
      validate(Profile, {
        ...valid,
        tags: [],
      })
    ).toThrow();
  });

  it("validateSafe returns success for valid data and error for invalid data", () => {
    const ok = validateSafe(Profile, valid);
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data).toEqual(valid);
    }

    const bad = validateSafe(Profile, { ...valid, name: null });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(bad.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("optional age can be omitted", () => {
    const { age: _a, ...withoutAge } = valid;
    const parsed = validate(Profile, withoutAge);
    expect(parsed.age).toBeUndefined();
  });
});
