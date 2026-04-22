import { getFields } from "../metadata.js";

const DEFAULT_MAX_DEPTH = 512;

function normalizeMaxDepth(maxDepth: number | undefined): number {
  if (maxDepth === undefined) {
    return DEFAULT_MAX_DEPTH;
  }
  if (maxDepth === Number.POSITIVE_INFINITY) {
    return Number.MAX_SAFE_INTEGER;
  }
  if (typeof maxDepth !== "number" || !Number.isFinite(maxDepth) || maxDepth < 0) {
    return DEFAULT_MAX_DEPTH;
  }
  return maxDepth;
}

export interface PlainToInstanceOptions {
  /**
   * Max nested transform depth (each `@Nested` / array `elementClass` step counts). Default 512.
   * `Number.POSITIVE_INFINITY` is treated as effectively unlimited. Non-finite or negative
   * values fall back to the default so depth checks cannot be bypassed (e.g. with `NaN`).
   */
  maxDepth?: number;
}

/**
 * Keys that must not be copied onto instances via `Object.assign` (prototype / constructor hazards).
 * This guards extra keys coming from client payloads (e.g. Zod `.passthrough()`); metadata-declared
 * field names are already blocked at `registerField` time.
 */
function isUnsafeAssignKey(key: string): boolean {
  return key === "__proto__" || key === "constructor" || key === "prototype";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function describeKind(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  if (typeof value === "object") {
    return (value as object).constructor?.name ?? "object";
  }
  return typeof value;
}

/**
 * Instantiates a class from a plain object without calling `new cls()`.
 * Walks `getFields` metadata: `nestedClass` and `elementClass` are turned into
 * real instances; other values are copied. Missing keys and `undefined` are
 * skipped; `null` is preserved. Extra keys not declared on the class (e.g. from
 * Zod `.passthrough()`) are copied onto the instance.
 *
 * @throws TypeError if `data` is not a plain object (including `null` and arrays), if nesting exceeds `options.maxDepth`, or on shape mismatch for nested/array metadata.
 */
export function plainToInstance<T>(
  cls: new (...args: unknown[]) => T,
  data: unknown,
  options?: PlainToInstanceOptions,
): T {
  const cap = normalizeMaxDepth(options?.maxDepth);
  return plainToInstanceImpl(cls, data, 0, cap);
}

function plainToInstanceImpl<T>(
  cls: new (...args: unknown[]) => T,
  data: unknown,
  depth: number,
  maxDepth: number,
): T {
  if (depth > maxDepth) {
    throw new TypeError("plainToInstance: maximum transform depth exceeded");
  }
  if (!isPlainObject(data)) {
    throw new TypeError(`plainToInstance: expected a plain object, got ${describeKind(data)}`);
  }
  const acc: Record<string, unknown> = Object.create({}) as Record<string, unknown>;
  const plain = data;
  const fields = getFields(cls);
  const fieldKeys = new Set(fields.map((f) => f.propertyKey));
  for (const field of fields) {
    const key = field.propertyKey;
    // Metadata keys are validated in `registerField`, so no unsafe-key check is needed here.
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
      if (!isPlainObject(value)) {
        throw new TypeError(
          `plainToInstance: expected plain object for nested field "${String(key)}", got ${describeKind(value)}`,
        );
      }
      acc[key] = plainToInstanceImpl(Nested, value, depth + 1, maxDepth) as unknown;
      continue;
    }
    if (field.elementClass) {
      const Elem = field.elementClass();
      if (!Array.isArray(value)) {
        throw new TypeError(
          `plainToInstance: expected array for field "${String(key)}", got ${describeKind(value)}`,
        );
      }
      acc[key] = value.map((el, i) => {
        if (el === null) {
          return el;
        }
        if (isPlainObject(el)) {
          return plainToInstanceImpl(Elem, el, depth + 1, maxDepth) as unknown;
        }
        throw new TypeError(
          `plainToInstance: expected plain object for "${String(key)}[${i}]", got ${describeKind(el)}`,
        );
      });
      continue;
    }
    acc[key] = value;
  }
  for (const key of Object.keys(plain)) {
    if (isUnsafeAssignKey(key)) {
      continue;
    }
    if (!fieldKeys.has(key) && !Object.prototype.hasOwnProperty.call(acc, key)) {
      acc[key] = plain[key];
    }
  }
  return Object.assign(Object.create(cls.prototype) as object, acc) as T;
}
