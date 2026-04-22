import "reflect-metadata";
import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { describe, expect, it, vi, afterEach } from "vitest";
import type { ZodError } from "zod";
import { IsArray, IsOptional, IsString, Nested } from "../decorators/index.js";
import { ZodValidationPipe } from "../nest/zod-validation-pipe.js";
import * as schemaBuilder from "../schema-builder.js";

function bodyMeta(metatype: object | undefined): import("@nestjs/common").ArgumentMetadata {
  return {
    type: "body",
    metatype: metatype as import("@nestjs/common").ArgumentMetadata["metatype"],
    data: "",
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ZodValidationPipe", () => {
  it("success path via @nestjs/testing module", async () => {
    class Dto {
      @IsString()
      name!: string;
    }
    const moduleRef = await Test.createTestingModule({
      providers: [ZodValidationPipe],
    }).compile();
    const pipe = moduleRef.get(ZodValidationPipe);
    const out = pipe.transform({ name: "Ada" }, bodyMeta(Dto));
    expect(out).toEqual({ name: "Ada" });
  });

  it("returns parsed data on success", () => {
    class Dto {
      @IsString()
      name!: string;
    }
    const pipe = new ZodValidationPipe();
    const out = pipe.transform({ name: "Ada" }, bodyMeta(Dto));
    expect(out).toEqual({ name: "Ada" });
  });

  it("throws BadRequestException with message and errors on failure", () => {
    class Dto {
      @IsString()
      name!: string;
    }
    const parsed = schemaBuilder.toZodSchema(Dto).safeParse({ name: 42 });
    expect(parsed.success).toBe(false);
    const issues = parsed.error!.issues;
    const pipe = new ZodValidationPipe();
    try {
      pipe.transform({ name: 42 }, bodyMeta(Dto));
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const res = (e as BadRequestException).getResponse() as {
        statusCode: number;
        message: string;
        errors: typeof issues;
      };
      expect(res.statusCode).toBe(400);
      expect(res.message).toBe("Validation failed");
      expect(res.errors).toEqual(issues);
    }
  });

  it("preserves Zod issue messages from @IsString({ message }) verbatim in errors", () => {
    class Dto {
      @IsString({ message: "must be text" })
      name!: string;
    }
    const pipe = new ZodValidationPipe();
    try {
      pipe.transform({ name: 123 }, bodyMeta(Dto));
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const res = (e as BadRequestException).getResponse() as {
        errors: { message: string }[];
      };
      expect(res.errors[0]?.message).toBe("must be text");
    }
  });

  it("passes through primitive metatypes unchanged", () => {
    const pipe = new ZodValidationPipe();
    expect(pipe.transform("hi", bodyMeta(String))).toBe("hi");
    expect(pipe.transform(3, bodyMeta(Number))).toBe(3);
    expect(pipe.transform(true, bodyMeta(Boolean))).toBe(true);
    expect(pipe.transform([1, 2], bodyMeta(Array))).toEqual([1, 2]);
    expect(pipe.transform({ a: 1 }, bodyMeta(Object))).toEqual({ a: 1 });
  });

  it("passes through undecorated classes without @Schema marker", () => {
    class Plain {
      foo!: string;
    }
    const pipe = new ZodValidationPipe();
    const raw = { foo: "bar" };
    expect(pipe.transform(raw, bodyMeta(Plain))).toBe(raw);
  });

  it("with transform: true, root DTO is instanceof", () => {
    class Dto {
      @IsString()
      name!: string;
    }
    const pipe = new ZodValidationPipe({ transform: true });
    const out = pipe.transform({ name: "Ada" }, bodyMeta(Dto));
    expect(out).toBeInstanceOf(Dto);
    expect((out as Dto).name).toBe("Ada");
  });

  it("with transform: true, @Nested field is instanceof nested class", () => {
    class Address {
      @IsString()
      street!: string;
    }
    class Profile {
      @IsString()
      name!: string;

      @Nested(() => Address)
      address!: Address;
    }
    const pipe = new ZodValidationPipe({ transform: true });
    const out = pipe.transform(
      { name: "Ada", address: { street: "1 Main" } },
      bodyMeta(Profile)
    ) as Profile;
    expect(out).toBeInstanceOf(Profile);
    expect(out.address).toBeInstanceOf(Address);
  });

  it("with transform: true, array of @Nested elements are all instanceof", () => {
    class Item {
      @IsString()
      id!: string;
    }
    class Holder {
      @IsArray({ elementClass: () => Item })
      items!: Item[];
    }
    const pipe = new ZodValidationPipe({ transform: true });
    const out = pipe.transform(
      { items: [{ id: "a" }, { id: "b" }] },
      bodyMeta(Holder)
    ) as Holder;
    expect(out.items[0]).toBeInstanceOf(Item);
    expect(out.items[1]).toBeInstanceOf(Item);
  });

  it("with transform: true, DTO with required-args constructor does not throw", () => {
    class C {
      constructor(_required: string) {}
      @IsString()
      name!: string;
    }
    const pipe = new ZodValidationPipe({ transform: true });
    const out = pipe.transform({ name: "x" }, bodyMeta(C));
    expect(out).toBeInstanceOf(C);
    expect((out as C).name).toBe("x");
  });

  it("invokes custom errorFactory on validation failure", () => {
    class Dto {
      @IsString()
      name!: string;
    }
    const custom = new Error("custom");
    const errorFactory = vi.fn((_e: ZodError) => custom);
    const pipe = new ZodValidationPipe({ errorFactory });
    expect(() => pipe.transform({ name: 1 }, bodyMeta(Dto))).toThrow(custom);
    expect(errorFactory).toHaveBeenCalledTimes(1);
    const arg = errorFactory.mock.calls[0]![0];
    expect(arg.issues.length).toBeGreaterThan(0);
  });

  it("reuses cached schema for the same metatype (toZodSchema called once)", () => {
    class Dto {
      @IsString()
      name!: string;
    }
    const spy = vi.spyOn(schemaBuilder, "toZodSchema");
    const pipe = new ZodValidationPipe();
    const meta = bodyMeta(Dto);
    pipe.transform({ name: "a" }, meta);
    pipe.transform({ name: "b" }, meta);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
