import "reflect-metadata";
import { z } from "zod";

export interface FieldMeta {
  propertyKey: string;
  factory: () => z.ZodTypeAny;
  isOptional: boolean;
  isNullable: boolean;
  defaultValue: unknown | undefined;
  transforms: Array<(schema: z.ZodTypeAny) => z.ZodTypeAny>;
  /** Sync predicates only; async checks are not supported (use parseAsync on the raw schema if needed). */
  refinements: Array<{ check: (val: unknown) => boolean; message?: string }>;
}

export const SCHEMA_FIELDS = Symbol("zod-decorator:schema-fields");
export const SCHEMA_MARKER = Symbol("zod-decorator:schema-marker");
export const SCHEMA_OBJECT_OPTIONS = Symbol("zod-decorator:schema-object-options");

export interface SchemaObjectOptions {
  unknownKeys: import("zod").UnknownKeysParam;
  catchall: z.ZodTypeAny;
}

function defaultFieldMeta(propertyKey: string): FieldMeta {
  return {
    propertyKey,
    factory: () => z.unknown(),
    isOptional: false,
    isNullable: false,
    defaultValue: undefined,
    transforms: [],
    refinements: [],
  };
}

function mergeFieldMeta(existing: FieldMeta, partial: Partial<FieldMeta>): FieldMeta {
  return {
    propertyKey: existing.propertyKey,
    factory: partial.factory ?? existing.factory,
    isOptional: partial.isOptional !== undefined ? partial.isOptional : existing.isOptional,
    isNullable: partial.isNullable !== undefined ? partial.isNullable : existing.isNullable,
    defaultValue: Object.prototype.hasOwnProperty.call(partial, "defaultValue")
      ? partial.defaultValue
      : existing.defaultValue,
    transforms: [...existing.transforms, ...(partial.transforms ?? [])],
    refinements: [...existing.refinements, ...(partial.refinements ?? [])],
  };
}

export function registerField(
  target: object,
  propertyKey: string | symbol,
  meta: Partial<FieldMeta>
): void {
  if (typeof propertyKey === "symbol") {
    throw new Error(
      "zod-decorator: symbol property keys are not supported; use string-keyed fields only."
    );
  }
  const ctor = target.constructor as new (...args: unknown[]) => unknown;
  const existingList = Reflect.getMetadata(SCHEMA_FIELDS, ctor) as FieldMeta[] | undefined;
  const list: FieldMeta[] = existingList ? [...existingList] : [];
  const idx = list.findIndex((f) => f.propertyKey === propertyKey);

  if (idx >= 0) {
    list[idx] = mergeFieldMeta(list[idx], meta);
  } else {
    list.push(mergeFieldMeta(defaultFieldMeta(propertyKey), meta));
  }

  Reflect.defineMetadata(SCHEMA_FIELDS, list, ctor);
}

export function getFields(cls: new (...args: unknown[]) => unknown): FieldMeta[] {
  const map = new Map<string, FieldMeta>();
  const chain: Function[] = [];
  let ctor: Function | null = cls as Function;
  while (ctor && ctor !== Object) {
    chain.push(ctor);
    ctor = Object.getPrototypeOf(ctor);
  }

  for (let i = chain.length - 1; i >= 0; i--) {
    const fields = Reflect.getMetadata(SCHEMA_FIELDS, chain[i]) as FieldMeta[] | undefined;
    if (fields) {
      for (const f of fields) {
        map.set(f.propertyKey, f);
      }
    }
  }

  return Array.from(map.values());
}
