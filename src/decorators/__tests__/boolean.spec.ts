import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { IsBoolean } from "../boolean.js";
import { toZodSchema } from "../../schema-builder.js";

describe("@IsBoolean()", () => {
  it("accepts true and false", () => {
    class C {
      @IsBoolean()
      b!: boolean;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ b: true })).toEqual({ b: true });
    expect(schema.parse({ b: false })).toEqual({ b: false });
  });

  it("rejects non-booleans", () => {
    class C {
      @IsBoolean()
      b!: boolean;
    }
    const schema = toZodSchema(C);
    expect(() => schema.parse({ b: 1 })).toThrow();
    expect(() => schema.parse({ b: "true" })).toThrow();
    expect(() => schema.parse({ b: null })).toThrow();
  });
});
