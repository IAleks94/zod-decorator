export const VERSION = "0.1.0";

export * from "./decorators/index.js";
export { toZodSchema, validate, validateSafe } from "./schema-builder.js";
export type { FieldMeta } from "./metadata.js";
