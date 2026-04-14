import type { z } from "zod";

export interface IsArrayMessages {
  base?: string;
  min?: string;
  max?: string;
  nonempty?: string;
}

export interface IsArrayOptions {
  items?: () => z.ZodTypeAny;
  min?: number;
  max?: number;
  nonempty?: boolean;
  message?: string | IsArrayMessages;
}
