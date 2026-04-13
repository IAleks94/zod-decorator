import "reflect-metadata";
import { z } from "zod";
import { registerField } from "../metadata.js";

export function IsOptional(): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, String(propertyKey), { isOptional: true });
  };
}

export function IsNullable(): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, String(propertyKey), { isNullable: true });
  };
}

export function Default(value: unknown): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, String(propertyKey), { defaultValue: value });
  };
}

export function Transform(fn: (val: unknown) => unknown): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, String(propertyKey), {
      transforms: [(schema: z.ZodTypeAny) => schema.transform((val) => fn(val))],
    });
  };
}

export function Refine(
  check: (val: unknown) => unknown,
  opts?: { message?: string }
): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, String(propertyKey), {
      refinements: [{ check, message: opts?.message }],
    });
  };
}
