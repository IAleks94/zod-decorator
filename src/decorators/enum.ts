import "reflect-metadata";
import { z } from "zod";
import { registerField } from "../metadata.js";

export function IsEnum(values: readonly string[] | z.EnumLike): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, String(propertyKey), {
      factory: () => {
        if (Array.isArray(values)) {
          if (values.length === 0) {
            return z.never();
          }
          return z.enum(values as [string, ...string[]]);
        }
        return z.nativeEnum(values as z.EnumLike);
      },
    });
  };
}
