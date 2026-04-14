import "reflect-metadata";
import { z } from "zod";
import { registerField } from "../../metadata.js";
import { createMsgResolver, resolveBaseMsg } from "../utils/message.js";
import type { IsStringOptions } from "./string.types.js";

function buildStringSchema(opts?: IsStringOptions): z.ZodString {
  let schema = z.string(resolveBaseMsg(opts?.message));
  if (!opts) return schema;
  const msg = createMsgResolver(opts.message);
  if (opts.trim) schema = schema.trim();
  if (opts.toLowerCase) schema = schema.toLowerCase();
  if (opts.toUpperCase) schema = schema.toUpperCase();
  if (opts.min !== undefined) schema = schema.min(opts.min, msg("min"));
  if (opts.max !== undefined) schema = schema.max(opts.max, msg("max"));
  if (opts.length !== undefined) schema = schema.length(opts.length, msg("length"));
  if (opts.email) schema = schema.email(msg("email"));
  if (opts.url) schema = schema.url(msg("url"));
  if (opts.uuid) schema = schema.uuid(msg("uuid"));
  if (opts.regex) schema = schema.regex(opts.regex, msg("regex"));
  if (opts.startsWith !== undefined) schema = schema.startsWith(opts.startsWith, msg("startsWith"));
  if (opts.endsWith !== undefined) schema = schema.endsWith(opts.endsWith, msg("endsWith"));
  return schema;
}

export function IsString(opts?: IsStringOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, propertyKey, {
      factory: () => buildStringSchema(opts),
    });
  };
}
