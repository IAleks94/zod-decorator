import "reflect-metadata";
import { z } from "zod";
import { registerField } from "../../metadata.js";
import { createMsgResolver, resolveBaseMsg } from "../utils/message.js";
import type { IsArrayOptions } from "./array.types.js";

function buildArraySchema(opts?: IsArrayOptions): z.ZodTypeAny {
  const inner = opts?.items ? opts.items() : z.unknown();
  let schema: z.ZodTypeAny = z.array(inner, resolveBaseMsg(opts?.message));
  if (!opts) return schema;
  const msg = createMsgResolver(opts.message);
  const arr = (): z.ZodArray<z.ZodTypeAny> => schema as z.ZodArray<z.ZodTypeAny>;
  if (opts.nonempty) schema = arr().nonempty(msg("nonempty"));
  if (opts.min !== undefined) schema = arr().min(opts.min, msg("min"));
  if (opts.max !== undefined) schema = arr().max(opts.max, msg("max"));
  return schema;
}

export function IsArray(opts?: IsArrayOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, propertyKey, {
      factory: () => buildArraySchema(opts),
    });
  };
}
