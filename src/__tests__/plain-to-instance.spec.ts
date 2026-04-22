import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { IsArray, IsOptional, IsString, Nested } from "../decorators/index.js";
import { plainToInstance } from "../nest/plain-to-instance.js";

describe("plainToInstance", () => {
  it("turns a flat DTO into a real class instance (instanceof)", () => {
    class User {
      @IsString()
      name!: string;
    }
    const u = plainToInstance(User, { name: "Ada" });
    expect(u).toBeInstanceOf(User);
    expect(u.name).toBe("Ada");
  });

  it("instantiates @Nested as the nested class (instanceof)", () => {
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
    const p = plainToInstance(Profile, {
      name: "Ada",
      address: { street: "1 Main" },
    });
    expect(p).toBeInstanceOf(Profile);
    expect(p.address).toBeInstanceOf(Address);
    expect(p.address.street).toBe("1 Main");
  });

  it("maps array of nested DTOs when elementClass is set (instanceof on each element)", () => {
    class Item {
      @IsString()
      id!: string;
    }
    class Holder {
      @IsArray({ elementClass: () => Item })
      items!: Item[];
    }
    const h = plainToInstance(Holder, {
      items: [{ id: "a" }, { id: "b" }],
    });
    expect(h).toBeInstanceOf(Holder);
    expect(h.items).toHaveLength(2);
    expect(h.items[0]).toBeInstanceOf(Item);
    expect(h.items[1]).toBeInstanceOf(Item);
  });

  it("does not throw for a class with a required-args constructor", () => {
    class C {
      constructor(_required: string) {}
      @IsString()
      name!: string;
    }
    expect(() => plainToInstance(C, { name: "x" })).not.toThrow();
    const c = plainToInstance(C, { name: "x" });
    expect(c).toBeInstanceOf(C);
    expect(c.name).toBe("x");
  });

  it("preserves null for nullable or present null values", () => {
    class Row {
      @IsString()
      key!: string;

      @IsOptional()
      @IsString()
      extra?: string | null;
    }
    const r = plainToInstance(Row, { key: "k", extra: null });
    expect(r.extra).toBeNull();
  });

  it("throws TypeError when data is not a plain object", () => {
    class User {
      @IsString()
      name!: string;
    }
    expect(() => plainToInstance(User, null)).toThrow(TypeError);
    expect(() => plainToInstance(User, undefined)).toThrow(TypeError);
    expect(() => plainToInstance(User, [])).toThrow(TypeError);
    expect(() => plainToInstance(User, "x")).toThrow(TypeError);
    expect(() => plainToInstance(User, new Date())).toThrow(TypeError);
  });

  it("copies extra keys not declared on the class (passthrough payloads)", () => {
    class User {
      @IsString()
      name!: string;
    }
    const u = plainToInstance(User, { name: "Ada", traceId: "t1" }) as User & { traceId?: string };
    expect(u.name).toBe("Ada");
    expect(u.traceId).toBe("t1");
  });

  it("ignores __proto__ / constructor / prototype keys so instanceof stays correct", () => {
    class User {
      @IsString()
      name!: string;
    }
    const payload = JSON.parse(
      '{"name":"Ada","__proto__":{"polluted":true},"constructor":{"x":1},"prototype":{"y":2}}',
    ) as Record<string, unknown>;
    const u = plainToInstance(User, payload);
    expect(u).toBeInstanceOf(User);
    expect((u as User & { polluted?: unknown }).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(u, "__proto__")).toBe(false);
  });

  it("leaves missing optional properties unset", () => {
    class User {
      @IsOptional()
      @IsString()
      name?: string;
    }
    const u = plainToInstance(User, {});
    expect(u).toBeInstanceOf(User);
    expect("name" in u).toBe(false);
  });
});
