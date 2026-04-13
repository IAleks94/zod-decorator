import "reflect-metadata";
import { z } from "zod";
import { registerField } from "../metadata.js";

export interface IsDateOptions {
  min?: Date;
  max?: Date;
}

function buildDateSchema(opts?: IsDateOptions): z.ZodDate {
  let d = z.date();
  if (!opts) {
    return d;
  }
  if (opts.min !== undefined) {
    d = d.min(opts.min);
  }
  if (opts.max !== undefined) {
    d = d.max(opts.max);
  }
  return d;
}

export function IsDate(opts?: IsDateOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, propertyKey, {
      factory: () => buildDateSchema(opts),
    });
  };
}
