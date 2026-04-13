import { z } from "zod";
import { getFields, SCHEMA_OBJECT_OPTIONS, type FieldMeta, type SchemaObjectOptions } from "./metadata.js";

function applyFieldMeta(field: FieldMeta): z.ZodTypeAny {
  let schema = field.factory();
  for (const r of field.refinements) {
    const params = r.message !== undefined ? { message: r.message } : {};
    schema = schema.refine(r.check, params);
  }
  for (const t of field.transforms) {
    schema = t(schema);
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

function finalizeObjectSchema(
  cls: new (...args: unknown[]) => unknown,
  shape: Record<string, z.ZodTypeAny>
): z.ZodObject<Record<string, z.ZodTypeAny>, z.UnknownKeysParam, z.ZodTypeAny> {
  let obj: z.ZodObject<Record<string, z.ZodTypeAny>, z.UnknownKeysParam, z.ZodTypeAny> =
    z.object(shape);
  const meta = Reflect.getMetadata(SCHEMA_OBJECT_OPTIONS, cls) as SchemaObjectOptions | undefined;
  if (meta) {
    if (meta.unknownKeys === "strict") {
      obj = obj.strict();
    } else if (meta.unknownKeys === "passthrough") {
      obj = obj.passthrough();
    }
    if (meta.catchall._def.typeName !== "ZodNever") {
      obj = obj.catchall(meta.catchall);
    }
  }
  return obj;
}

export function toZodSchema<T>(
  cls: new (...args: unknown[]) => T
): z.ZodObject<Record<string, z.ZodTypeAny>, z.UnknownKeysParam, z.ZodTypeAny> {
  const fields = getFields(cls);
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.propertyKey] = applyFieldMeta(field);
  }
  return finalizeObjectSchema(cls as new (...args: unknown[]) => unknown, shape);
}

export function validate<T>(
  cls: new (...args: unknown[]) => T,
  data: unknown
): T {
  return toZodSchema(cls).parse(data) as T;
}

export function validateSafe<T>(
  cls: new (...args: unknown[]) => T,
  data: unknown
): z.SafeParseReturnType<unknown, T> {
  return toZodSchema(cls).safeParse(data) as z.SafeParseReturnType<unknown, T>;
}
