import "reflect-metadata";
import { z } from "zod";
import { registerField } from "../metadata.js";

export interface IsStringOptions {
  min?: number;
  max?: number;
  length?: number;
  email?: boolean;
  url?: boolean;
  uuid?: boolean;
  regex?: RegExp;
  trim?: boolean;
  toLowerCase?: boolean;
  toUpperCase?: boolean;
  startsWith?: string;
  endsWith?: string;
}

function buildStringSchema(opts?: IsStringOptions): z.ZodString {
  let s = z.string();
  if (!opts) {
    return s;
  }
  if (opts.min !== undefined) {
    s = s.min(opts.min);
  }
  if (opts.max !== undefined) {
    s = s.max(opts.max);
  }
  if (opts.length !== undefined) {
    s = s.length(opts.length);
  }
  if (opts.email) {
    s = s.email();
  }
  if (opts.url) {
    s = s.url();
  }
  if (opts.uuid) {
    s = s.uuid();
  }
  if (opts.regex) {
    s = s.regex(opts.regex);
  }
  if (opts.trim) {
    s = s.trim();
  }
  if (opts.toLowerCase) {
    s = s.toLowerCase();
  }
  if (opts.toUpperCase) {
    s = s.toUpperCase();
  }
  if (opts.startsWith !== undefined) {
    s = s.startsWith(opts.startsWith);
  }
  if (opts.endsWith !== undefined) {
    s = s.endsWith(opts.endsWith);
  }
  return s;
}

export function IsString(opts?: IsStringOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerField(target, String(propertyKey), {
      factory: () => buildStringSchema(opts),
    });
  };
}
