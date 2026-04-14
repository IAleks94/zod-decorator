import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { IsNumber } from "./number.js";
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

describe("@IsNumber() message", () => {
  it("uses string message as base type error", () => {
    class C {
      @IsNumber({ message: "not a number" })
      n!: number;
    }
    expect(() => toZodSchema(C).parse({ n: "abc" })).toThrow("not a number");
  });

  it("applies per-constraint messages", () => {
    class C {
      @IsNumber({
        min: 5,
        max: 10,
        message: { min: "too small", max: "too big" },
      })
      n!: number;
    }
    const schema = toZodSchema(C);
    expect(() => schema.parse({ n: 1 })).toThrow("too small");
    expect(() => schema.parse({ n: 20 })).toThrow("too big");
  });

  it("applies int message", () => {
    class C {
      @IsNumber({ int: true, message: { int: "must be integer" } })
      n!: number;
    }
    expect(() => toZodSchema(C).parse({ n: 1.5 })).toThrow("must be integer");
  });

  it("applies positive message", () => {
    class C {
      @IsNumber({ positive: true, message: { positive: "must be positive" } })
      n!: number;
    }
    expect(() => toZodSchema(C).parse({ n: -1 })).toThrow("must be positive");
  });

  it("applies negative message", () => {
    class C {
      @IsNumber({ negative: true, message: { negative: "must be negative" } })
      n!: number;
    }
    expect(() => toZodSchema(C).parse({ n: 1 })).toThrow("must be negative");
  });

  it("applies nonnegative message", () => {
    class C {
      @IsNumber({ nonnegative: true, message: { nonnegative: "no negatives" } })
      n!: number;
    }
    expect(() => toZodSchema(C).parse({ n: -1 })).toThrow("no negatives");
  });

  it("applies finite message", () => {
    class C {
      @IsNumber({ finite: true, message: { finite: "must be finite" } })
      n!: number;
    }
    expect(() => toZodSchema(C).parse({ n: Infinity })).toThrow("must be finite");
  });

  it("applies multipleOf message", () => {
    class C {
      @IsNumber({ multipleOf: 3, message: { multipleOf: "must be multiple of 3" } })
      n!: number;
    }
    expect(() => toZodSchema(C).parse({ n: 4 })).toThrow("must be multiple of 3");
  });

  it("uses base in object message for type error alongside constraint messages", () => {
    class C {
      @IsNumber({
        min: 5,
        message: { base: "must be a number", min: "at least 5" },
      })
      n!: number;
    }
    const schema = toZodSchema(C);
    expect(() => schema.parse({ n: "abc" })).toThrow("must be a number");
    expect(() => schema.parse({ n: 1 })).toThrow("at least 5");
  });
});
