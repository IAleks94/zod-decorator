import { describe, expect, it } from "vitest";
import { z } from "zod";
import { getFields, registerField } from "../metadata.js";

describe("registerField", () => {
  it("associates fields with the class when decorating static properties", () => {
    class A {}
    registerField(A as object, "id", { factory: () => z.string() });
    const fields = getFields(A);
    expect(fields.some((f) => f.propertyKey === "id")).toBe(true);
  });

  it("rejects symbol property keys", () => {
    class A {}
    expect(() =>
      registerField(A.prototype, Symbol("x"), { factory: () => z.string() })
    ).toThrow(/symbol property keys are not supported/);
  });

  it("merges partial metadata for the same propertyKey instead of replacing the entry", () => {
    class A {}
    registerField(A.prototype, "x", { factory: () => z.string() });
    registerField(A.prototype, "x", { isOptional: true });
    const fields = getFields(A);
    const x = fields.find((f) => f.propertyKey === "x");
    expect(x).toBeDefined();
    expect(x!.factory().parse("hello")).toBe("hello");
    expect(x!.isOptional).toBe(true);
  });

  it("preserves refinements and transforms when factory is set again", () => {
    class A {}
    registerField(A.prototype, "x", { factory: () => z.string() });
    registerField(A.prototype, "x", {
      refinements: [{ check: (v) => typeof v === "string" }],
    });
    registerField(A.prototype, "x", { factory: () => z.number() });
    const x = getFields(A).find((f) => f.propertyKey === "x")!;
    expect(x.refinements).toHaveLength(1);
    expect(x.transforms).toHaveLength(0);
    expect(x.factory().parse(1)).toBe(1);
  });

  it("clears refinements when factory is set again with explicit empty refinements", () => {
    class A {}
    registerField(A.prototype, "x", { factory: () => z.string() });
    registerField(A.prototype, "x", {
      refinements: [{ check: (v) => typeof v === "string" }],
    });
    registerField(A.prototype, "x", {
      factory: () => z.number(),
      refinements: [],
      transforms: [],
    });
    const x = getFields(A).find((f) => f.propertyKey === "x")!;
    expect(x.refinements).toHaveLength(0);
    expect(x.transforms).toHaveLength(0);
    expect(x.factory().parse(1)).toBe(1);
  });

  it("appends transforms and refinements when merging the same field", () => {
    class A {}
    const t1 = (s: z.ZodTypeAny) => s;
    const t2 = (s: z.ZodTypeAny) => s;
    registerField(A.prototype, "x", { transforms: [t1] });
    registerField(A.prototype, "x", { transforms: [t2] });
    registerField(A.prototype, "x", {
      refinements: [{ check: (v) => v === 1 }],
    });
    registerField(A.prototype, "x", {
      refinements: [{ check: (v) => v === 2 }],
    });
    const x = getFields(A).find((f) => f.propertyKey === "x")!;
    expect(x.transforms).toHaveLength(2);
    expect(x.refinements).toHaveLength(2);
  });
});

describe("getFields", () => {
  it("collects fields from the prototype chain with child overriding parent for the same key", () => {
    class Parent {}
    class Child extends Parent {}

    registerField(Parent.prototype, "a", { factory: () => z.string() });
    registerField(Child.prototype, "a", { factory: () => z.number() });
    registerField(Child.prototype, "b", { factory: () => z.boolean() });

    const childFields = getFields(Child);
    const keys = childFields.map((f) => f.propertyKey).sort();
    expect(keys).toEqual(["a", "b"]);
    const a = childFields.find((f) => f.propertyKey === "a")!;
    expect(a.factory().parse(7)).toBe(7);
  });

  it("returns parent-only fields when querying the child class", () => {
    class Parent {}
    class Child extends Parent {}
    registerField(Parent.prototype, "onlyParent", { factory: () => z.literal("p") });
    const fields = getFields(Child);
    expect(fields.map((f) => f.propertyKey)).toContain("onlyParent");
  });
});

describe("FieldMeta nestedClass / elementClass", () => {
  it("preserves nestedClass when merging without replacing factory", () => {
    class Nested {}
    const thunk = () => Nested;
    class A {}
    registerField(A.prototype, "x", { factory: () => z.object({}), nestedClass: thunk });
    registerField(A.prototype, "x", { isOptional: true });
    const x = getFields(A).find((f) => f.propertyKey === "x")!;
    expect(x.nestedClass).toBe(thunk);
  });

  it("preserves elementClass when merging without replacing factory", () => {
    class El {}
    const thunk = () => El;
    class A {}
    registerField(A.prototype, "xs", { factory: () => z.array(z.unknown()), elementClass: thunk });
    registerField(A.prototype, "xs", { isNullable: true });
    const f = getFields(A).find((k) => k.propertyKey === "xs")!;
    expect(f.elementClass).toBe(thunk);
  });

  it("preserves nestedClass when factory is replaced if partial omits nestedClass", () => {
    class N {}
    const thunk = () => N;
    class A {}
    registerField(A.prototype, "x", { factory: () => z.string(), nestedClass: thunk });
    registerField(A.prototype, "x", { factory: () => z.number() });
    const x = getFields(A).find((f) => f.propertyKey === "x")!;
    expect(x.nestedClass).toBe(thunk);
    expect(x.factory().parse(1)).toBe(1);
  });

  it("inherits parent nestedClass and lets child override for the same key", () => {
    class N1 {}
    class N2 {}
    const t1 = () => N1;
    const t2 = () => N2;
    class Parent {}
    class Child extends Parent {}
    registerField(Parent.prototype, "x", { factory: () => z.string(), nestedClass: t1 });
    registerField(Child.prototype, "x", { factory: () => z.number(), nestedClass: t2 });
    const childX = getFields(Child).find((f) => f.propertyKey === "x")!;
    expect(childX.nestedClass).toBe(t2);
  });

  it("inherits parent elementClass via getFields on child", () => {
    class E {}
    const thunk = () => E;
    class Parent {}
    class Child extends Parent {}
    registerField(Parent.prototype, "items", { factory: () => z.array(z.unknown()), elementClass: thunk });
    const items = getFields(Child).find((f) => f.propertyKey === "items")!;
    expect(items.elementClass).toBe(thunk);
  });

  it("child overrides parent elementClass for the same key", () => {
    class E1 {}
    class E2 {}
    const t1 = () => E1;
    const t2 = () => E2;
    class Parent {}
    class Child extends Parent {}
    registerField(Parent.prototype, "items", { factory: () => z.array(z.unknown()), elementClass: t1 });
    registerField(Child.prototype, "items", { factory: () => z.array(z.number()), elementClass: t2 });
    const items = getFields(Child).find((f) => f.propertyKey === "items")!;
    expect(items.elementClass).toBe(t2);
  });
});
