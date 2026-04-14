import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { IsString } from "../string/string.js";
import { Nested } from "./nested.js";
import { toZodSchema } from "../../schema-builder.js";

describe("@Nested()", () => {
  it("validates nested decorated classes", () => {
    class Inner {
      @IsString()
      name!: string;
    }

    class Outer {
      @Nested(() => Inner)
      inner!: Inner;
    }

    const schema = toZodSchema(Outer);
    expect(schema.parse({ inner: { name: "a" } })).toEqual({
      inner: { name: "a" },
    });
    expect(() => schema.parse({ inner: { name: 1 } })).toThrow();
  });

  it("does not overflow the stack for mutually nested classes", () => {
    class A {
      @Nested(() => B)
      b!: B;
    }
    class B {
      @Nested(() => A)
      a!: A;
    }
    expect(() => toZodSchema(A)).not.toThrow();
  });

  it("supports forward references via factory (nested class declared after parent)", () => {
    class Outer {
      @Nested(() => Inner)
      inner!: Inner;
    }

    class Inner {
      @IsString()
      name!: string;
    }

    const schema = toZodSchema(Outer);
    expect(schema.parse({ inner: { name: "x" } })).toEqual({
      inner: { name: "x" },
    });
    expect(() => schema.parse({ inner: { name: 1 } })).toThrow();
  });
});
