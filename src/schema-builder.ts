import { z } from "zod";
import { getFields, type FieldMeta } from "./metadata.js";

function applyFieldMeta(field: FieldMeta): z.ZodTypeAny {
  let schema = field.factory();
  for (const t of field.transforms) {
    schema = t(schema);
  }
  for (const r of field.refinements) {
    const params = r.message !== undefined ? { message: r.message } : {};
    schema = schema.refine((val) => Boolean(r.check(val)), params);
  }
  if (field.isOptional) {
    schema = schema.optional();
  }
  if (field.isNullable) {
    schema = schema.nullable();
  }
  if (field.defaultValue !== undefined) {
    schema = schema.default(field.defaultValue);
  }
  return schema;
}

export function toZodSchema<T>(
  cls: new (...args: unknown[]) => T
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const fields = getFields(cls);
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.propertyKey] = applyFieldMeta(field);
  }
  return z.object(shape);
}
