import "reflect-metadata";
import { z } from "zod";
import {
  registerField,
  SCHEMA_OBJECT_OPTIONS,
  type FieldWrapperStep,
} from "./metadata.js";
import { toZodSchema } from "./schema-builder.js";

function unwrapFieldSchema(fieldSchema: z.ZodTypeAny): {
  inner: z.ZodTypeAny;
  wrapperChain: FieldWrapperStep[];
} {
  let current: z.ZodTypeAny = fieldSchema;
  const wrapperChain: FieldWrapperStep[] = [];

  while (true) {
    if (current instanceof z.ZodOptional) {
      wrapperChain.push({ kind: "optional" });
      current = current.unwrap();
    } else if (current instanceof z.ZodNullable) {
      wrapperChain.push({ kind: "nullable" });
      current = current.unwrap();
    } else if (current instanceof z.ZodDefault) {
      const zDef = current;
      wrapperChain.push({ kind: "default", factory: zDef._def.defaultValue });
      current = zDef.removeDefault();
    } else {
      break;
    }
  }

  return { inner: current, wrapperChain };
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

  // Zod object shapes are keyed by strings only, so `Object.keys` is exhaustive here.
  for (const key of Object.keys(shape)) {
    const fieldSchema = shape[key]!;
    const { inner, wrapperChain } = unwrapFieldSchema(fieldSchema);

    if (inner instanceof z.ZodObject) {
      const nestedName = `${toSafeClassName(key)}Nested`;
      const NestedCls = fromZodSchema(
        inner as z.ZodObject<z.ZodRawShape>,
        nestedName
      );
      registerField(Cls.prototype, key, {
        factory: () =>
          z.lazy(() => toZodSchema(NestedCls)) as z.ZodTypeAny,
        wrapperChain,
        transforms: [],
        refinements: [],
      });
    } else {
      registerField(Cls.prototype, key, {
        factory: () => inner,
        wrapperChain,
        transforms: [],
        refinements: [],
      });
    }
  }

  return Cls;
}
