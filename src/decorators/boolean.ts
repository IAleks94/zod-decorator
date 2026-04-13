import "reflect-metadata";
import { z } from "zod";
import { registerField } from "../metadata.js";

export function IsBoolean(): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, propertyKey, {
      factory: () => z.boolean(),
    });
  };
}
