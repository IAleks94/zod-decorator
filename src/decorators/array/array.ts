import "reflect-metadata";
import { z } from "zod";
import { registerField } from "../../metadata.js";
import { toZodSchema } from "../../schema-builder.js";
import { createMsgResolver, resolveBaseMsg } from "../utils/message.js";
import type { IsArrayOptions } from "./array.types.js";

function buildArraySchema(opts?: IsArrayOptions): z.ZodTypeAny {
  let inner: z.ZodTypeAny;
  if (opts?.items) {
    inner = opts.items();
  } else if (opts?.elementClass) {
    const elementClass = opts.elementClass;
    inner = z.lazy(() => toZodSchema(elementClass())) as z.ZodTypeAny;
  } else {
    inner = z.unknown();
  }
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
      ...(opts?.elementClass && !opts?.items ? { elementClass: opts.elementClass } : {}),
    });
  };
}
