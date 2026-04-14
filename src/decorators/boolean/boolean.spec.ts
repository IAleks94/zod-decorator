import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { IsBoolean } from "./boolean.js";
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

describe("@IsBoolean() message", () => {
  it("uses string message as base type error", () => {
    class C {
      @IsBoolean({ message: "not a boolean" })
      b!: boolean;
    }
    expect(() => toZodSchema(C).parse({ b: "yes" })).toThrow("not a boolean");
  });

  it("still works without message", () => {
    class C {
      @IsBoolean()
      b!: boolean;
    }
    expect(toZodSchema(C).parse({ b: true })).toEqual({ b: true });
  });
});
