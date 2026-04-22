import type { z } from "zod";

export interface IsArrayMessages {
  base?: string;
  min?: string;
  max?: string;
  nonempty?: string;
}

export interface IsArrayOptions {
  items?: () => z.ZodTypeAny;
  /**
   * When set and `items` is omitted, element schema is built from `toZodSchema(elementClass())` (lazy),
   * and `elementClass` is stored for `plainToInstance` / `ZodValidationPipe({ transform: true })`.
   * If `items` is set, it alone defines the element type; `elementClass` is ignored.
   */
  elementClass?: () => new (...args: unknown[]) => unknown;
  min?: number;
  max?: number;
  nonempty?: boolean;
  message?: string | IsArrayMessages;
}
