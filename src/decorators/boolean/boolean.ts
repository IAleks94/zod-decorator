import "reflect-metadata";
import { z } from "zod";
import { registerField } from "../../metadata.js";
import { resolveBaseMsg } from "../utils/message.js";
import type { IsBooleanOptions } from "./boolean.types.js";

export function IsBoolean(opts?: IsBooleanOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, propertyKey, {
      factory: () => z.boolean(resolveBaseMsg(opts?.message)),
    });
  };
}
