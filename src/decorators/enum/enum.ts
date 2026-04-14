import "reflect-metadata";
import { z } from "zod";
import { registerField } from "../../metadata.js";
import { resolveBaseMsg } from "../utils/message.js";
import type { IsEnumOptions } from "./enum.types.js";

export function IsEnum(values: readonly string[] | z.EnumLike, opts?: IsEnumOptions): PropertyDecorator {
  if (Array.isArray(values) && values.length === 0) {
    throw new Error(
      "zod-decorator: @IsEnum requires a non-empty string array (empty tuple is not supported)."
    );
  }
  return (target, propertyKey) => {
    const params = resolveBaseMsg(opts?.message);
    registerField(target, propertyKey, {
      factory: () => {
        if (Array.isArray(values)) {
          return z.enum(values as [string, ...string[]], params);
        }
        return z.nativeEnum(values as z.EnumLike, params);
      },
    });
  };
}
