import "reflect-metadata";
import { z } from "zod";
import { registerField } from "../metadata.js";

export interface IsNumberOptions {
  int?: boolean;
  positive?: boolean;
  negative?: boolean;
  nonnegative?: boolean;
  min?: number;
  max?: number;
  finite?: boolean;
  multipleOf?: number;
}

function buildNumberSchema(opts?: IsNumberOptions): z.ZodNumber {
  let n = z.number();
  if (!opts) {
    return n;
  }
  if (opts.int) {
    n = n.int();
  }
  if (opts.finite) {
    n = n.finite();
  }
  if (opts.positive) {
    n = n.positive();
  }
  if (opts.negative) {
    n = n.negative();
  }
  if (opts.nonnegative) {
    n = n.nonnegative();
  }
  if (opts.min !== undefined) {
    n = n.min(opts.min);
  }
  if (opts.max !== undefined) {
    n = n.max(opts.max);
  }
  if (opts.multipleOf !== undefined) {
    n = n.multipleOf(opts.multipleOf);
  }
  return n;
}

export function IsNumber(opts?: IsNumberOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, propertyKey, {
      factory: () => buildNumberSchema(opts),
    });
  };
}
