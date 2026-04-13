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

  it("throws when string tuple is empty", () => {
    expect(() => {
      class C {
        @IsEnum([] as const)
        e!: string;
      }
      void C;
    }).toThrow(/empty string array/);
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
