import "reflect-metadata";
import { describe, expect, it } from "vitest";
import {
  IsNumber,
  IsOptional,
  IsString,
  Refine,
  Transform,
} from "../decorators/index.js";
import { toZodSchema } from "../schema-builder.js";

describe("edge cases", () => {
  it("class inheritance merges parent and child decorated fields", () => {
    class Parent {
      @IsString()
      fromParent!: string;
    }

    class Child extends Parent {
      @IsNumber()
      fromChild!: number;
    }

    const schema = toZodSchema(Child);
    expect(schema.parse({ fromParent: "a", fromChild: 1 })).toEqual({
      fromParent: "a",
      fromChild: 1,
    });
  });

  it("decorator ordering: @IsOptional before vs after @IsString both allow omission", () => {
    class OptFirst {
      @IsOptional()
      @IsString()
      s?: string;
    }

    class OptAfter {
      @IsString()
      @IsOptional()
      s?: string;
    }

    expect(toZodSchema(OptFirst).parse({})).toEqual({});
    expect(toZodSchema(OptAfter).parse({})).toEqual({});
    expect(toZodSchema(OptFirst).parse({ s: "x" })).toEqual({ s: "x" });
    expect(toZodSchema(OptAfter).parse({ s: "x" })).toEqual({ s: "x" });
  });

  it("multiple type decorators on same field: last applied wins factory", () => {
    class LastNumberWins {
      @IsNumber()
      @IsString()
      x!: number;
    }

    const schema = toZodSchema(LastNumberWins);
    expect(schema.parse({ x: 42 })).toEqual({ x: 42 });
    expect(() => schema.parse({ x: "text" })).toThrow();
  });

  it("modifiers merge: refinements and transforms stack on the winning type", () => {
    class C {
      @Refine((v) => v === "ok")
      @Transform((v) => String(v).toUpperCase())
      @IsString()
      s!: string;
    }

    const schema = toZodSchema(C);
    expect(schema.parse({ s: "ok" })).toEqual({ s: "OK" });
    expect(() => schema.parse({ s: "bad" })).toThrow();
  });

  it("empty class produces z.object({})", () => {
    class Empty {}

    const schema = toZodSchema(Empty);
    expect(schema.parse({})).toEqual({});
    expect(Object.keys(schema.shape)).toHaveLength(0);
  });
});
