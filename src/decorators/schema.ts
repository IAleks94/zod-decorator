import "reflect-metadata";
import { SCHEMA_MARKER } from "../metadata.js";

export function Schema(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(SCHEMA_MARKER, true, target);
  };
}
