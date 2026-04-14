import "reflect-metadata";
import { z } from "zod";
import { registerField } from "../../metadata.js";
import { createMsgResolver, resolveBaseMsg } from "../utils/message.js";
import type { IsDateOptions } from "./date.types.js";

function buildDateSchema(opts?: IsDateOptions): z.ZodDate {
  let schema = z.date(resolveBaseMsg(opts?.message));
  if (!opts) return schema;
  const msg = createMsgResolver(opts.message);
  if (opts.min !== undefined) schema = schema.min(opts.min, msg("min"));
  if (opts.max !== undefined) schema = schema.max(opts.max, msg("max"));
  return schema;
}

export function IsDate(opts?: IsDateOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, propertyKey, {
      factory: () => buildDateSchema(opts),
    });
  };
}
