import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { IsEnum } from "../enum.js";
import { toZodSchema } from "../../schema-builder.js";

enum NativeColor {
  Red = "red",
  Blue = "blue",
}

describe("@IsEnum()", () => {
  it("validates string array enums", () => {
    class C {
      @IsEnum(["a", "b"] as const)
      e!: string;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ e: "a" })).toEqual({ e: "a" });
    expect(() => schema.parse({ e: "c" })).toThrow();
  });

  it("rejects all values for empty string tuple", () => {
    class C {
      @IsEnum([] as const)
      e!: string;
    }
    const schema = toZodSchema(C);
    expect(() => schema.parse({ e: "a" })).toThrow();
    expect(() => schema.parse({ e: "" })).toThrow();
  });

  it("validates native TypeScript enums", () => {
    class C {
      @IsEnum(NativeColor)
      e!: NativeColor;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ e: NativeColor.Red })).toEqual({ e: NativeColor.Red });
    expect(() => schema.parse({ e: "green" })).toThrow();
  });
});
