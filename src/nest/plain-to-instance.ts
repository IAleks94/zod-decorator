import { getFields } from "../metadata.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Instantiates a class from a plain object without calling `new cls()`.
 * Walks `getFields` metadata: `nestedClass` and `elementClass` are turned into
 * real instances; other values are copied. Missing keys and `undefined` are
 * skipped; `null` is preserved. Extra keys not declared on the class (e.g. from
 * Zod `.passthrough()`) are copied onto the instance.
 *
 * @throws TypeError if `data` is not a plain object (including `null` and arrays).
 */
export function plainToInstance<T>(cls: new (...args: unknown[]) => T, data: unknown): T {
  if (!isPlainObject(data)) {
    const kind =
      data === null
        ? "null"
        : Array.isArray(data)
          ? "array"
          : data !== null && typeof data === "object"
            ? (data as object).constructor?.name ?? "object"
            : typeof data;
    throw new TypeError(`plainToInstance: expected a plain object, got ${kind}`);
  }
  const acc: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  const plain = data;
  const fields = getFields(cls);
  const fieldKeys = new Set(fields.map((f) => f.propertyKey));
  for (const field of fields) {
    const key = field.propertyKey;
    if (!Object.prototype.hasOwnProperty.call(plain, key)) {
      continue;
    }
    const value = plain[key];
    if (value === undefined) {
      continue;
    }
    if (value === null) {
      acc[key] = null;
      continue;
    }
    if (field.nestedClass) {
      const Nested = field.nestedClass();
      if (isPlainObject(value)) {
        acc[key] = plainToInstance(Nested, value) as unknown;
      } else {
        acc[key] = value;
      }
      continue;
    }
    if (field.elementClass) {
      const Elem = field.elementClass();
      if (Array.isArray(value)) {
        acc[key] = value.map((el) => {
          if (el === null) {
            return el;
          }
          if (isPlainObject(el)) {
            return plainToInstance(Elem, el) as unknown;
          }
          return el;
        });
      } else {
        acc[key] = value;
      }
      continue;
    }
    acc[key] = value;
  }
  for (const key of Object.keys(plain)) {
    if (!fieldKeys.has(key) && !Object.prototype.hasOwnProperty.call(acc, key)) {
      acc[key] = plain[key];
    }
  }
  return Object.assign(Object.create(cls.prototype) as object, acc) as T;
}
