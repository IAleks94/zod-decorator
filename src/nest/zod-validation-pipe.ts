import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import { z, type ZodError } from "zod";
import { getFields, SCHEMA_MARKER } from "../metadata.js";
import { toZodSchema } from "../schema-builder.js";
import { plainToInstance } from "./plain-to-instance.js";

const schemaCache = new WeakMap<
  new (...args: unknown[]) => unknown,
  z.ZodObject<Record<string, z.ZodTypeAny>, z.UnknownKeysParam, z.ZodTypeAny>
>();

export interface ZodValidationPipeOptions {
  transform?: boolean;
  errorFactory?: (error: ZodError) => Error;
}

@Injectable()
export class ZodValidationPipe implements PipeTransform<unknown, unknown> {
  constructor(private readonly options: ZodValidationPipeOptions = {}) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const metatype = metadata.metatype as (new (...args: unknown[]) => unknown) | undefined;

    if (
      metatype === undefined ||
      metatype === String ||
      metatype === Number ||
      metatype === Boolean ||
      metatype === Array ||
      metatype === Object
    ) {
      return value;
    }

    const fields = getFields(metatype);
    const hasSchemaMarker = Reflect.getMetadata(SCHEMA_MARKER, metatype) === true;
    if (fields.length === 0 && !hasSchemaMarker) {
      return value;
    }

    let schema = schemaCache.get(metatype);
    if (!schema) {
      schema = toZodSchema(metatype);
      schemaCache.set(metatype, schema);
    }

    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      const err = parsed.error;
      if (this.options.errorFactory) {
        throw this.options.errorFactory(err);
      }
      throw new BadRequestException({
        statusCode: 400,
        message: "Validation failed",
        errors: err.issues,
      });
    }

    if (this.options.transform) {
      return plainToInstance(metatype, parsed.data);
    }
    return parsed.data;
  }
}
