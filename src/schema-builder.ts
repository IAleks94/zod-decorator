import { z } from "zod";
import {
  getFields,
  SCHEMA_OBJECT_OPTIONS,
  type FieldMeta,
  type FieldWrapperStep,
  type SchemaObjectOptions,
} from "./metadata.js";

/**
 * Whether `wrapperChain` already encodes a modifier of the given kind. Checking the whole chain —
 * not just the outermost Zod type — prevents double-wrapping when decorator flags are merged onto a
 * field built from `fromZodSchema` and the outer layer is a different wrapper (e.g. `ZodDefault`
 * wrapping an inner `ZodOptional`).
 */
function chainHas(
  chain: FieldWrapperStep[] | undefined,
  kind: FieldWrapperStep["kind"]
): boolean {
  return chain !== undefined && chain.some((step) => step.kind === kind);
}

function applyFieldMeta(field: FieldMeta): z.ZodTypeAny {
  let schema = field.factory();
  for (const r of field.refinements) {
    const params = r.message !== undefined ? { message: r.message } : {};
    schema = schema.refine(r.check, params);
  }
  for (const t of field.transforms) {
    schema = t(schema);
  }
  const chain = field.wrapperChain;
  if (chain !== undefined && chain.length > 0) {
    for (let i = chain.length - 1; i >= 0; i--) {
      const step = chain[i]!;
      if (step.kind === "optional") {
        schema = schema.optional();
      } else if (step.kind === "nullable") {
        schema = schema.nullable();
      } else {
        schema = schema.default(step.factory as never);
      }
    }
  }
  // Decorator / merge flags (e.g. subclass adds @IsNullable on a fromZodSchema field): apply after
  // wrapperChain so merged modifiers are not ignored. Skip if wrapperChain already encodes the
  // modifier (checked at any depth, not just the outer layer) or if the outermost Zod type matches.
  if (
    field.isOptional &&
    !chainHas(chain, "optional") &&
    !(schema instanceof z.ZodOptional)
  ) {
    schema = schema.optional();
  }
  if (
    field.isNullable &&
    !chainHas(chain, "nullable") &&
    !(schema instanceof z.ZodNullable)
  ) {
    schema = schema.nullable();
  }
  if (
    field.hasDefault &&
    !chainHas(chain, "default") &&
    !(schema instanceof z.ZodDefault)
  ) {
    schema = schema.default(field.defaultValue as never);
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
    if (meta.catchall != null && !(meta.catchall instanceof z.ZodNever)) {
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

/**
 * Parses `data` against the Zod schema derived from `cls`. Each call rebuilds the schema via
 * `toZodSchema` (prototype walk + shape assembly). For hot paths outside NestJS, cache the result
 * of `toZodSchema(cls)` yourself — the `ZodValidationPipe` does this via an internal `WeakMap`.
 */
export function validate<T>(
  cls: new (...args: unknown[]) => T,
  data: unknown
): T {
  return toZodSchema(cls).parse(data) as T;
}

/** Non-throwing counterpart of `validate`. Same caching caveat applies — see `validate`. */
export function validateSafe<T>(
  cls: new (...args: unknown[]) => T,
  data: unknown
): z.SafeParseReturnType<unknown, T> {
  return toZodSchema(cls).safeParse(data) as z.SafeParseReturnType<unknown, T>;
}
