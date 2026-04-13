import "reflect-metadata";
import { z } from "zod";
import { registerField, SCHEMA_OBJECT_OPTIONS } from "./metadata.js";
import { toZodSchema } from "./schema-builder.js";

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
    const t = current._def.typeName as string;
    if (t === "ZodOptional") {
      isOptional = true;
      current = (current as z.ZodOptional<z.ZodTypeAny>).unwrap();
    } else if (t === "ZodNullable") {
      isNullable = true;
      current = (current as z.ZodNullable<z.ZodTypeAny>).unwrap();
    } else if (t === "ZodDefault") {
      defaultValue = (current as z.ZodDefault<z.ZodTypeAny>)._def.defaultValue();
      current = (current as z.ZodDefault<z.ZodTypeAny>).removeDefault();
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
  Reflect.defineMetadata(SCHEMA_OBJECT_OPTIONS, {
    unknownKeys: schema._def.unknownKeys,
    catchall: schema._def.catchall,
  }, Cls);

  const shape = schema.shape;

  for (const key of Object.keys(shape)) {
    const fieldSchema = shape[key]!;
    const { inner, isOptional, isNullable, defaultValue } =
      unwrapFieldSchema(fieldSchema);

    if (inner._def.typeName === "ZodObject") {
      const nestedName = `${toSafeClassName(key)}Nested`;
      const NestedCls = fromZodSchema(
        inner as z.ZodObject<z.ZodRawShape>,
        nestedName
      );
      registerField(Cls.prototype, key, {
        factory: () =>
          z.lazy(() => toZodSchema(NestedCls)) as z.ZodTypeAny,
        isOptional,
        isNullable,
        defaultValue,
        transforms: [],
        refinements: [],
      });
    } else {
      registerField(Cls.prototype, key, {
        factory: () => inner,
        isOptional,
        isNullable,
        defaultValue,
        transforms: [],
        refinements: [],
      });
    }
  }

  return Cls;
}
