import "reflect-metadata";
import { z } from "zod";

/** Wrapper sequence as unwrapped outer-to-inner by `fromZodSchema`; `toZodSchema` reapplies inner-to-outer (reverse). */
export type FieldWrapperStep =
  | { kind: "optional" }
  | { kind: "nullable" }
  | { kind: "default"; factory: () => unknown };

export interface FieldMeta {
  propertyKey: string;
  factory: () => z.ZodTypeAny;
  isOptional: boolean;
  isNullable: boolean;
  defaultValue: unknown | undefined;
  /**
   * True when `@Default(value)` has been registered for this field (including `@Default(undefined)`).
   * Required because `defaultValue: undefined` is a legitimate Zod default and cannot otherwise be
   * distinguished from "no default set".
   */
  hasDefault: boolean;
  /**
   * When set (e.g. by `fromZodSchema`), modifiers are applied from the base schema in **reverse** order
   * so the rebuilt Zod tree matches the original. Decorator-only fields omit this and use
   * `isOptional` / `isNullable` / `defaultValue` in a fixed pipeline order instead.
   */
  wrapperChain?: FieldWrapperStep[];
  /** Constructor thunk for `@Nested` — used by `plainToInstance` to instantiate nested DTOs. */
  nestedClass?: () => new (...args: unknown[]) => unknown;
  /** Element constructor thunk for `@IsArray({ elementClass })` — used by `plainToInstance` for array elements. */
  elementClass?: () => new (...args: unknown[]) => unknown;
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
    hasDefault: false,
    transforms: [],
    refinements: [],
  };
}

const hasOwn = (obj: object, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

function mergeFieldMeta(existing: FieldMeta, partial: Partial<FieldMeta>): FieldMeta {
  const factoryReplaced = hasOwn(partial, "factory") && partial.factory !== undefined;
  const defaultReplaced = hasOwn(partial, "defaultValue") || partial.hasDefault === true;
  // transforms / refinements: replace on factory swap, append otherwise (registration order).
  const transforms = factoryReplaced
    ? (hasOwn(partial, "transforms") ? partial.transforms! : [...existing.transforms])
    : [...existing.transforms, ...(partial.transforms ?? [])];
  const refinements = factoryReplaced
    ? (hasOwn(partial, "refinements") ? partial.refinements! : [...existing.refinements])
    : [...existing.refinements, ...(partial.refinements ?? [])];
  return {
    propertyKey: existing.propertyKey,
    factory: factoryReplaced ? partial.factory! : (partial.factory ?? existing.factory),
    isOptional: partial.isOptional !== undefined ? partial.isOptional : existing.isOptional,
    isNullable: partial.isNullable !== undefined ? partial.isNullable : existing.isNullable,
    defaultValue: hasOwn(partial, "defaultValue") ? partial.defaultValue : existing.defaultValue,
    hasDefault: defaultReplaced ? true : existing.hasDefault,
    wrapperChain: hasOwn(partial, "wrapperChain") ? partial.wrapperChain : existing.wrapperChain,
    nestedClass: hasOwn(partial, "nestedClass") ? partial.nestedClass : existing.nestedClass,
    elementClass: hasOwn(partial, "elementClass") ? partial.elementClass : existing.elementClass,
    transforms,
    refinements,
  };
}

function metadataConstructor(
  target: object
): new (...args: unknown[]) => unknown {
  // Instance property decorators receive the prototype; static property decorators receive the class constructor.
  if (typeof target === "function") {
    return target as new (...args: unknown[]) => unknown;
  }
  return target.constructor as new (...args: unknown[]) => unknown;
}

/** Property names that could poison the prototype chain if written onto instances. */
const UNSAFE_PROPERTY_KEYS = new Set(["__proto__", "constructor", "prototype"]);

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
  if (UNSAFE_PROPERTY_KEYS.has(propertyKey)) {
    throw new Error(
      `zod-decorator: unsafe property key "${propertyKey}" cannot be decorated (prototype pollution risk).`
    );
  }
  const ctor = metadataConstructor(target);
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

type AnyConstructor = (new (...args: unknown[]) => unknown) | ((...args: unknown[]) => unknown);

/** True if this constructor or any ancestor (until `Object`) has `@Schema()`. Aligns with `getFields` prototype walk. */
export function hasSchemaMarkerInChain(cls: new (...args: unknown[]) => unknown): boolean {
  let ctor: AnyConstructor | null = cls;
  while (ctor && ctor !== Object) {
    if (Reflect.getMetadata(SCHEMA_MARKER, ctor) === true) {
      return true;
    }
    ctor = Object.getPrototypeOf(ctor) as AnyConstructor | null;
  }
  return false;
}

export function getFields(cls: new (...args: unknown[]) => unknown): FieldMeta[] {
  const map = new Map<string, FieldMeta>();
  const chain: AnyConstructor[] = [];
  let ctor: AnyConstructor | null = cls;
  while (ctor && ctor !== Object) {
    chain.push(ctor);
    ctor = Object.getPrototypeOf(ctor) as AnyConstructor | null;
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
