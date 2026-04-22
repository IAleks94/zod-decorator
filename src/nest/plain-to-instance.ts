import { getFields } from "../metadata.js";

/**
 * Instantiates a class from a plain object without calling `new cls()`.
 * Walks `getFields` metadata: `nestedClass` and `elementClass` are turned into
 * real instances; other values are copied. Missing keys and `undefined` are
 * skipped; `null` is preserved.
 */
export function plainToInstance<T>(cls: new (...args: unknown[]) => T, data: unknown): T {
  const acc: Record<string, unknown> = {};
  if (data !== null && data !== undefined && typeof data === "object" && !Array.isArray(data)) {
    const plain = data as Record<string, unknown>;
    for (const field of getFields(cls)) {
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
        if (typeof value === "object" && !Array.isArray(value)) {
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
            if (typeof el === "object" && !Array.isArray(el)) {
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
  }
  return Object.assign(Object.create(cls.prototype) as object, acc) as T;
}
