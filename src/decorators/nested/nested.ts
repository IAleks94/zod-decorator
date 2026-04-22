import "reflect-metadata";
import { z } from "zod";
import { registerField } from "../../metadata.js";
import { toZodSchema } from "../../schema-builder.js";

export function Nested(
  classFn: () => new (...args: unknown[]) => unknown
): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, propertyKey, {
      factory: () =>
        z.lazy(() => toZodSchema(classFn())) as z.ZodTypeAny,
      nestedClass: classFn,
    });
  };
}
