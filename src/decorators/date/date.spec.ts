import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { IsDate } from "./date.js";
import { toZodSchema } from "../../schema-builder.js";

describe("@IsDate()", () => {
  it("accepts Date instances and rejects invalid dates", () => {
    class C {
      @IsDate()
      d!: Date;
    }
    const schema = toZodSchema(C);
    const d = new Date("2020-01-01T00:00:00.000Z");
    const out = schema.parse({ d });
    expect(out.d).toBeInstanceOf(Date);
    expect(out.d.getTime()).toBe(d.getTime());
    expect(() => schema.parse({ d: "2020-01-01" })).toThrow();
  });

  it("enforces min date", () => {
    const min = new Date("2020-06-01T00:00:00.000Z");
    class C {
      @IsDate({ min })
      d!: Date;
    }
    const schema = toZodSchema(C);
    const ok = new Date("2021-01-01T00:00:00.000Z");
    expect(schema.parse({ d: ok }).d.getTime()).toBe(ok.getTime());
    expect(() => schema.parse({ d: new Date("2019-01-01T00:00:00.000Z") })).toThrow();
  });

  it("enforces max date", () => {
    const max = new Date("2020-12-31T00:00:00.000Z");
    class C {
      @IsDate({ max })
      d!: Date;
    }
    const schema = toZodSchema(C);
    const ok = new Date("2020-06-01T00:00:00.000Z");
    expect(schema.parse({ d: ok }).d.getTime()).toBe(ok.getTime());
    expect(() => schema.parse({ d: new Date("2021-01-01T00:00:00.000Z") })).toThrow();
  });
});

describe("@IsDate() message", () => {
  it("uses string message as base type error", () => {
    class C {
      @IsDate({ message: "not a date" })
      d!: Date;
    }
    expect(() => toZodSchema(C).parse({ d: "not-a-date" })).toThrow("not a date");
  });

  it("applies per-constraint messages", () => {
    const min = new Date("2020-01-01");
    const max = new Date("2020-12-31");
    class C {
      @IsDate({ min, max, message: { min: "too early", max: "too late" } })
      d!: Date;
    }
    const schema = toZodSchema(C);
    expect(() => schema.parse({ d: new Date("2019-01-01") })).toThrow("too early");
    expect(() => schema.parse({ d: new Date("2021-01-01") })).toThrow("too late");
  });

  it("uses base in object message for type error alongside constraint messages", () => {
    const min = new Date("2020-01-01");
    class C {
      @IsDate({ min, message: { base: "must be a date", min: "too early" } })
      d!: Date;
    }
    const schema = toZodSchema(C);
    expect(() => schema.parse({ d: "nope" })).toThrow("must be a date");
    expect(() => schema.parse({ d: new Date("2019-01-01") })).toThrow("too early");
  });
});
