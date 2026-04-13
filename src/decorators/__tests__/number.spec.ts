import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { IsNumber } from "../number.js";
import { toZodSchema } from "../../schema-builder.js";

describe("@IsNumber()", () => {
  it("accepts finite numbers and rejects non-numbers", () => {
    class C {
      @IsNumber()
      n!: number;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ n: 3.14 })).toEqual({ n: 3.14 });
    expect(() => schema.parse({ n: "1" })).toThrow();
    expect(() => schema.parse({ n: NaN })).toThrow();
  });

  it("enforces int", () => {
    class C {
      @IsNumber({ int: true })
      n!: number;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ n: 2 })).toEqual({ n: 2 });
    expect(() => schema.parse({ n: 2.5 })).toThrow();
  });

  it("enforces positive", () => {
    class C {
      @IsNumber({ positive: true })
      n!: number;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ n: 0.001 })).toEqual({ n: 0.001 });
    expect(() => schema.parse({ n: 0 })).toThrow();
    expect(() => schema.parse({ n: -1 })).toThrow();
  });

  it("enforces negative", () => {
    class C {
      @IsNumber({ negative: true })
      n!: number;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ n: -1 })).toEqual({ n: -1 });
    expect(() => schema.parse({ n: 0 })).toThrow();
  });

  it("enforces nonnegative", () => {
    class C {
      @IsNumber({ nonnegative: true })
      n!: number;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ n: 0 })).toEqual({ n: 0 });
    expect(() => schema.parse({ n: -0.001 })).toThrow();
  });

  it("enforces min and max", () => {
    class C {
      @IsNumber({ min: 2, max: 5 })
      n!: number;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ n: 3 })).toEqual({ n: 3 });
    expect(() => schema.parse({ n: 1 })).toThrow();
    expect(() => schema.parse({ n: 6 })).toThrow();
  });

  it("enforces finite", () => {
    class C {
      @IsNumber({ finite: true })
      n!: number;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ n: 1 })).toEqual({ n: 1 });
    expect(() => schema.parse({ n: Infinity })).toThrow();
  });

  it("enforces multipleOf", () => {
    class C {
      @IsNumber({ multipleOf: 0.5 })
      n!: number;
    }
    const schema = toZodSchema(C);
    expect(schema.parse({ n: 1.5 })).toEqual({ n: 1.5 });
    expect(() => schema.parse({ n: 1.3 })).toThrow();
  });
});
