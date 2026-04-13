import "reflect-metadata";
import { registerField } from "../metadata.js";
import { toZodSchema } from "../schema-builder.js";

export function Nested(
  classFn: () => new (...args: unknown[]) => unknown
): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, String(propertyKey), {
      factory: () => toZodSchema(classFn()),
    });
  };
}
