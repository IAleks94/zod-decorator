import "reflect-metadata";
import { z } from "zod";
import { registerField } from "../metadata.js";

export function IsEnum(values: readonly string[] | z.EnumLike): PropertyDecorator {
  if (Array.isArray(values) && values.length === 0) {
    throw new Error(
      "zod-decorator: @IsEnum requires a non-empty string array (empty tuple is not supported)."
    );
  }
  return (target, propertyKey) => {
    registerField(target, propertyKey, {
      factory: () => {
        if (Array.isArray(values)) {
          return z.enum(values as [string, ...string[]]);
        }
        return z.nativeEnum(values as z.EnumLike);
      },
    });
  };
}
