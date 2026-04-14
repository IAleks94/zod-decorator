import "reflect-metadata";
import { z } from "zod";
import { registerField } from "../../metadata.js";
import { createMsgResolver, resolveBaseMsg } from "../utils/message.js";
import type { IsNumberOptions } from "./number.types.js";

function buildNumberSchema(opts?: IsNumberOptions): z.ZodNumber {
  let schema = z.number(resolveBaseMsg(opts?.message));
  if (!opts) return schema;
  const msg = createMsgResolver(opts.message);
  if (opts.int) schema = schema.int(msg("int"));
  if (opts.finite) schema = schema.finite(msg("finite"));
  if (opts.positive) schema = schema.positive(msg("positive"));
  if (opts.negative) schema = schema.negative(msg("negative"));
  if (opts.nonnegative) schema = schema.nonnegative(msg("nonnegative"));
  if (opts.min !== undefined) schema = schema.min(opts.min, msg("min"));
  if (opts.max !== undefined) schema = schema.max(opts.max, msg("max"));
  if (opts.multipleOf !== undefined) schema = schema.multipleOf(opts.multipleOf, msg("multipleOf"));
  return schema;
}

export function IsNumber(opts?: IsNumberOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, propertyKey, {
      factory: () => buildNumberSchema(opts),
    });
  };
}
