import "reflect-metadata";
import { z } from "zod";
import { registerField } from "../../metadata.js";

export function IsOptional(): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, propertyKey, { isOptional: true });
  };
}

export function IsNullable(): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, propertyKey, { isNullable: true });
  };
}

export function Default(value: unknown): PropertyDecorator {
  return (target, propertyKey) => {
    // hasDefault flag lets `applyFieldMeta` distinguish `@Default(undefined)` — a valid Zod default —
    // from "no default set"; without it the sentinel check `defaultValue !== undefined` swallows the decorator.
    registerField(target, propertyKey, { defaultValue: value, hasDefault: true });
  };
}

export function Transform(fn: (val: unknown) => unknown): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, propertyKey, {
      // The `(val) => fn(val)` indirection drops Zod's second `ctx` argument, which `fn` does not accept.
      // Passing `fn` directly would widen its signature in the type-checker; the wrapper keeps the user API narrow.
      transforms: [(schema: z.ZodTypeAny) => schema.transform((val) => fn(val))],
    });
  };
}

export function Refine(
  check: (val: unknown) => boolean,
  opts?: { message?: string }
): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, propertyKey, {
      refinements: [{ check, message: opts?.message }],
    });
  };
}
