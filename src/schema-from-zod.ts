import "reflect-metadata";
import { z } from "zod";
import { registerField } from "./metadata.js";

function unwrapFieldSchema(fieldSchema: z.ZodTypeAny): {
  inner: z.ZodTypeAny;
  isOptional: boolean;
  isNullable: boolean;
  defaultValue: unknown | undefined;
} {
  let current: z.ZodTypeAny = fieldSchema;
  let isOptional = false;
  let isNullable = false;
  let defaultValue: unknown | undefined = undefined;

  while (true) {
    if (current instanceof z.ZodOptional) {
      isOptional = true;
      current = current.unwrap();
    } else if (current instanceof z.ZodNullable) {
      isNullable = true;
      current = current.unwrap();
    } else if (current instanceof z.ZodDefault) {
      defaultValue = current._def.defaultValue();
      current = current.removeDefault();
    } else {
      break;
    }
  }

  return { inner: current, isOptional, isNullable, defaultValue };
}

function toSafeClassName(name: string): string {
  const s = name.replace(/[^A-Za-z0-9_$]/g, "_");
  const base = /^[A-Za-z_$]/.test(s) ? s : `_${s}`;
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(base) ? base : "GeneratedSchema";
}

function createConstructor(name: string | undefined): new () => unknown {
  const safeName = name ? toSafeClassName(name) : "GeneratedSchema";
  const ctor = { [safeName]: class {} }[safeName];
  return ctor as new () => unknown;
}

export function fromZodSchema<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  name?: string
): new () => z.infer<T> {
  const Cls = createConstructor(name) as new () => z.infer<T>;
  const shape = schema.shape;

  for (const key of Object.keys(shape)) {
    const fieldSchema = shape[key]!;
    const { inner, isOptional, isNullable, defaultValue } =
      unwrapFieldSchema(fieldSchema);

    registerField(Cls.prototype, key, {
      factory: () => inner,
      isOptional,
      isNullable,
      defaultValue,
      transforms: [],
      refinements: [],
    });
  }

  return Cls;
}
