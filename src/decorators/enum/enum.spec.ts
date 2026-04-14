import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { IsEnum } from "./enum.js";
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

describe("@IsEnum() message", () => {
  it("uses message for string array enums", () => {
    class C {
      @IsEnum(["a", "b"] as const, { message: "pick a or b" })
      e!: string;
    }
    expect(() => toZodSchema(C).parse({ e: "c" })).toThrow("pick a or b");
  });

  it("uses message for native enums", () => {
    class C {
      @IsEnum(NativeColor, { message: "invalid color" })
      c!: NativeColor;
    }
    expect(() => toZodSchema(C).parse({ c: "green" })).toThrow("invalid color");
  });

  it("still works without message", () => {
    class C {
      @IsEnum(["x", "y"] as const)
      e!: string;
    }
    expect(toZodSchema(C).parse({ e: "x" })).toEqual({ e: "x" });
  });
});
