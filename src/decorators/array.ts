import "reflect-metadata";
import { z } from "zod";
import { registerField } from "../metadata.js";

export interface IsArrayOptions {
  items?: () => z.ZodTypeAny;
  min?: number;
  max?: number;
  nonempty?: boolean;
}

function buildArraySchema(opts?: IsArrayOptions): z.ZodTypeAny {
  const inner = opts?.items ? opts.items() : z.unknown();
  let a: z.ZodTypeAny = z.array(inner);
  if (!opts) {
    return a;
  }
  if (opts.nonempty) {
    a = (a as z.ZodArray<z.ZodTypeAny>).nonempty();
  }
  if (opts.min !== undefined) {
    a = (a as z.ZodArray<z.ZodTypeAny>).min(opts.min);
  }
  if (opts.max !== undefined) {
    a = (a as z.ZodArray<z.ZodTypeAny>).max(opts.max);
  }
  return a;
}

export function IsArray(opts?: IsArrayOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, propertyKey, {
      factory: () => buildArraySchema(opts),
    });
  };
}
