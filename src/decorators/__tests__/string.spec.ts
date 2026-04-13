import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { IsString } from "../string.js";
import { toZodSchema } from "../../schema-builder.js";

describe("@IsString()", () => {
  it("accepts any string and rejects non-strings", () => {
    class C {
      @IsString()
      s!: string;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ s: "hello" })).toEqual({ s: "hello" });
    expect(() => schema.parse({ s: 1 })).toThrow();
  });

  it("enforces min length", () => {
    class C {
      @IsString({ min: 3 })
      s!: string;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ s: "abc" })).toEqual({ s: "abc" });
    expect(() => schema.parse({ s: "ab" })).toThrow();
  });

  it("enforces max length", () => {
    class C {
      @IsString({ max: 3 })
      s!: string;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ s: "abc" })).toEqual({ s: "abc" });
    expect(() => schema.parse({ s: "abcd" })).toThrow();
  });

  it("enforces exact length", () => {
    class C {
      @IsString({ length: 4 })
      s!: string;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ s: "abcd" })).toEqual({ s: "abcd" });
    expect(() => schema.parse({ s: "abc" })).toThrow();
  });

  it("validates email", () => {
    class C {
      @IsString({ email: true })
      s!: string;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ s: "a@b.co" })).toEqual({ s: "a@b.co" });
    expect(() => schema.parse({ s: "not-an-email" })).toThrow();
  });

  it("validates url", () => {
    class C {
      @IsString({ url: true })
      s!: string;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ s: "https://example.com" })).toEqual({
      s: "https://example.com",
    });
    expect(() => schema.parse({ s: "not a url" })).toThrow();
  });

  it("validates uuid", () => {
    class C {
      @IsString({ uuid: true })
      s!: string;
    }
    const schema = toZodSchema(C);
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(schema.parse({ s: id })).toEqual({ s: id });
    expect(() => schema.parse({ s: "nope" })).toThrow();
  });

  it("validates regex", () => {
    class C {
      @IsString({ regex: /^[A-Z]{2}$/ })
      s!: string;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ s: "AB" })).toEqual({ s: "AB" });
    expect(() => schema.parse({ s: "ab" })).toThrow();
  });

  it("trims input", () => {
    class C {
      @IsString({ trim: true })
      s!: string;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ s: "  hi  " })).toEqual({ s: "hi" });
  });

  it("transforms to lower case", () => {
    class C {
      @IsString({ toLowerCase: true })
      s!: string;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ s: "HELLO" })).toEqual({ s: "hello" });
  });

  it("transforms to upper case", () => {
    class C {
      @IsString({ toUpperCase: true })
      s!: string;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ s: "hello" })).toEqual({ s: "HELLO" });
  });

  it("enforces startsWith", () => {
    class C {
      @IsString({ startsWith: "pre-" })
      s!: string;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ s: "pre-fix" })).toEqual({ s: "pre-fix" });
    expect(() => schema.parse({ s: "wrong" })).toThrow();
  });

  it("enforces endsWith", () => {
    class C {
      @IsString({ endsWith: ".ts" })
      s!: string;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ s: "file.ts" })).toEqual({ s: "file.ts" });
    expect(() => schema.parse({ s: "file.js" })).toThrow();
  });

  it("combines multiple options in one schema", () => {
    class C {
      @IsString({ min: 1, max: 10, trim: true, toLowerCase: true })
      s!: string;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ s: "  AbC  " })).toEqual({ s: "abc" });
    expect(() => schema.parse({ s: "" })).toThrow();
  });
});
