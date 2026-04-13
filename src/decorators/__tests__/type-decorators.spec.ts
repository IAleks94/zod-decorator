import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { SCHEMA_MARKER } from "../../metadata.js";
import { toZodSchema } from "../../schema-builder.js";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsString,
  Nested,
  Schema,
} from "../index.js";

describe("@Schema", () => {
  it("marks the class with SCHEMA_MARKER metadata", () => {
    @Schema()
    class Marked {}
    expect(Reflect.getMetadata(SCHEMA_MARKER, Marked)).toBe(true);
  });
});

describe("@IsString", () => {
  it("validates basic strings", () => {
    class T {
      @IsString()
      s!: string;
    }
    const schema = toZodSchema(T);
    expect(schema.parse({ s: "a" })).toEqual({ s: "a" });
    expect(() => schema.parse({ s: 1 })).toThrow();
  });

  it("applies min, max, and length", () => {
    class A {
      @IsString({ min: 2 })
      a!: string;
    }
    class B {
      @IsString({ max: 3 })
      b!: string;
    }
    class C {
      @IsString({ length: 2 })
      c!: string;
    }
    expect(toZodSchema(A).parse({ a: "ab" })).toEqual({ a: "ab" });
    expect(() => toZodSchema(A).parse({ a: "a" })).toThrow();
    expect(toZodSchema(B).parse({ b: "ab" })).toEqual({ b: "ab" });
    expect(() => toZodSchema(B).parse({ b: "abcd" })).toThrow();
    expect(toZodSchema(C).parse({ c: "ab" })).toEqual({ c: "ab" });
    expect(() => toZodSchema(C).parse({ c: "a" })).toThrow();
  });

  it("applies email, url, and uuid", () => {
    class E {
      @IsString({ email: true })
      e!: string;
    }
    class U {
      @IsString({ url: true })
      u!: string;
    }
    class I {
      @IsString({ uuid: true })
      i!: string;
    }
    expect(toZodSchema(E).parse({ e: "a@b.co" })).toEqual({ e: "a@b.co" });
    expect(() => toZodSchema(E).parse({ e: "nope" })).toThrow();
    expect(toZodSchema(U).parse({ u: "https://example.com" })).toEqual({ u: "https://example.com" });
    expect(() => toZodSchema(U).parse({ u: "not-a-url" })).toThrow();
    expect(
      toZodSchema(I).parse({ i: "550e8400-e29b-41d4-a716-446655440000" })
    ).toEqual({ i: "550e8400-e29b-41d4-a716-446655440000" });
    expect(() => toZodSchema(I).parse({ i: "bad" })).toThrow();
  });

  it("applies regex", () => {
    class R {
      @IsString({ regex: /^[a-c]+$/ })
      r!: string;
    }
    expect(toZodSchema(R).parse({ r: "abc" })).toEqual({ r: "abc" });
    expect(() => toZodSchema(R).parse({ r: "xyz" })).toThrow();
  });

  it("applies trim, toLowerCase, and toUpperCase", () => {
    class Tr {
      @IsString({ trim: true })
      t!: string;
    }
    class Lo {
      @IsString({ toLowerCase: true })
      l!: string;
    }
    class Up {
      @IsString({ toUpperCase: true })
      u!: string;
    }
    expect(toZodSchema(Tr).parse({ t: "  hi  " })).toEqual({ t: "hi" });
    expect(toZodSchema(Lo).parse({ l: "Hi" })).toEqual({ l: "hi" });
    expect(toZodSchema(Up).parse({ u: "hi" })).toEqual({ u: "HI" });
  });

  it("applies startsWith and endsWith", () => {
    class S {
      @IsString({ startsWith: "pre-" })
      a!: string;
    }
    class E {
      @IsString({ endsWith: "-suf" })
      b!: string;
    }
    expect(toZodSchema(S).parse({ a: "pre-x" })).toEqual({ a: "pre-x" });
    expect(() => toZodSchema(S).parse({ a: "x" })).toThrow();
    expect(toZodSchema(E).parse({ b: "x-suf" })).toEqual({ b: "x-suf" });
    expect(() => toZodSchema(E).parse({ b: "x" })).toThrow();
  });
});

describe("@IsNumber", () => {
  it("validates numbers", () => {
    class T {
      @IsNumber()
      n!: number;
    }
    const schema = toZodSchema(T);
    expect(schema.parse({ n: 1.5 })).toEqual({ n: 1.5 });
    expect(() => schema.parse({ n: "1" })).toThrow();
  });

  it("applies int, positive, negative, nonnegative", () => {
    class I {
      @IsNumber({ int: true })
      i!: number;
    }
    class P {
      @IsNumber({ positive: true })
      p!: number;
    }
    class N {
      @IsNumber({ negative: true })
      n!: number;
    }
    class NN {
      @IsNumber({ nonnegative: true })
      nn!: number;
    }
    expect(toZodSchema(I).parse({ i: 2 })).toEqual({ i: 2 });
    expect(() => toZodSchema(I).parse({ i: 1.1 })).toThrow();
    expect(toZodSchema(P).parse({ p: 0.1 })).toEqual({ p: 0.1 });
    expect(() => toZodSchema(P).parse({ p: 0 })).toThrow();
    expect(toZodSchema(N).parse({ n: -1 })).toEqual({ n: -1 });
    expect(() => toZodSchema(N).parse({ n: 1 })).toThrow();
    expect(toZodSchema(NN).parse({ nn: 0 })).toEqual({ nn: 0 });
    expect(() => toZodSchema(NN).parse({ nn: -1 })).toThrow();
  });

  it("applies min, max, finite, and multipleOf", () => {
    class R {
      @IsNumber({ min: 2, max: 5 })
      r!: number;
    }
    class F {
      @IsNumber({ finite: true })
      f!: number;
    }
    class M {
      @IsNumber({ multipleOf: 3 })
      m!: number;
    }
    expect(toZodSchema(R).parse({ r: 3 })).toEqual({ r: 3 });
    expect(() => toZodSchema(R).parse({ r: 1 })).toThrow();
    expect(() => toZodSchema(R).parse({ r: 6 })).toThrow();
    expect(toZodSchema(F).parse({ f: 1 })).toEqual({ f: 1 });
    expect(() => toZodSchema(F).parse({ f: Number.POSITIVE_INFINITY })).toThrow();
    expect(toZodSchema(M).parse({ m: 9 })).toEqual({ m: 9 });
    expect(() => toZodSchema(M).parse({ m: 10 })).toThrow();
  });
});

describe("@IsBoolean", () => {
  it("accepts true and false and rejects other values", () => {
    class T {
      @IsBoolean()
      b!: boolean;
    }
    const schema = toZodSchema(T);
    expect(schema.parse({ b: true })).toEqual({ b: true });
    expect(schema.parse({ b: false })).toEqual({ b: false });
    expect(() => schema.parse({ b: "yes" })).toThrow();
  });
});

describe("@IsDate", () => {
  it("validates Date instances", () => {
    class T {
      @IsDate()
      d!: Date;
    }
    const d = new Date("2020-01-01");
    expect(toZodSchema(T).parse({ d })).toEqual({ d });
    expect(() => toZodSchema(T).parse({ d: "2020-01-01" })).toThrow();
  });

  it("applies min and max", () => {
    const min = new Date("2020-01-01");
    const max = new Date("2020-12-31");
    class T {
      @IsDate({ min, max })
      d!: Date;
    }
    const mid = new Date("2020-06-01");
    expect(toZodSchema(T).parse({ d: mid })).toEqual({ d: mid });
    expect(() => toZodSchema(T).parse({ d: new Date("2019-01-01") })).toThrow();
  });
});

describe("@IsEnum", () => {
  it("validates string tuple enums", () => {
    class T {
      @IsEnum(["a", "b"] as const)
      e!: string;
    }
    expect(toZodSchema(T).parse({ e: "a" })).toEqual({ e: "a" });
    expect(() => toZodSchema(T).parse({ e: "c" })).toThrow();
  });

  it("validates native TypeScript enums", () => {
    enum Color {
      Red = "red",
      Blue = "blue",
    }
    class T {
      @IsEnum(Color)
      c!: Color;
    }
    expect(toZodSchema(T).parse({ c: "red" })).toEqual({ c: "red" });
    expect(() => toZodSchema(T).parse({ c: "green" })).toThrow();
  });
});

describe("@IsArray", () => {
  it("defaults items to unknown", () => {
    class T {
      @IsArray()
      a!: unknown[];
    }
    expect(toZodSchema(T).parse({ a: [1, "x", {}] })).toEqual({ a: [1, "x", {}] });
  });

  it("uses items factory when provided", () => {
    class T {
      @IsArray({ items: () => z.string() })
      a!: string[];
    }
    expect(toZodSchema(T).parse({ a: ["x"] })).toEqual({ a: ["x"] });
    expect(() => toZodSchema(T).parse({ a: [1] })).toThrow();
  });

  it("applies min, max, and nonempty", () => {
    class M {
      @IsArray({ min: 2 })
      a!: unknown[];
    }
    class X {
      @IsArray({ max: 2 })
      b!: unknown[];
    }
    class N {
      @IsArray({ nonempty: true })
      c!: unknown[];
    }
    expect(toZodSchema(M).parse({ a: [1, 2] })).toEqual({ a: [1, 2] });
    expect(() => toZodSchema(M).parse({ a: [1] })).toThrow();
    expect(toZodSchema(X).parse({ b: [1] })).toEqual({ b: [1] });
    expect(() => toZodSchema(X).parse({ b: [1, 2, 3] })).toThrow();
    expect(toZodSchema(N).parse({ c: [1] })).toEqual({ c: [1] });
    expect(() => toZodSchema(N).parse({ c: [] })).toThrow();
  });
});

describe("@Nested", () => {
  it("embeds a nested object schema", () => {
    class Child {
      @IsString()
      name!: string;
    }
    class Parent {
      @Nested(() => Child)
      child!: Child;
    }
    const schema = toZodSchema(Parent);
    expect(schema.parse({ child: { name: "Ann" } })).toEqual({
      child: { name: "Ann" },
    });
    expect(() => schema.parse({ child: { name: 1 } })).toThrow();
  });

  it("supports forward references via factory", () => {
    class Outer {
      @Nested(() => Inner)
      inner!: Inner;
    }
    class Inner {
      @IsNumber()
      n!: number;
    }
    expect(toZodSchema(Outer).parse({ inner: { n: 1 } })).toEqual({
      inner: { n: 1 },
    });
  });
});
