# zod-decorator

[![npm version](https://img.shields.io/npm/v/@ialeks/zod-decorator.svg)](https://www.npmjs.com/package/@ialeks/zod-decorator)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)

TypeScript decorators for **Zod** schema validation. If you like the **class-validator** developer experience (decorating class properties) but want Zod’s runtime types, inference, and ecosystem, this library bridges the two: decorators register metadata, then `toZodSchema` builds a `z.object()` you can parse, compose, and reuse like any other Zod schema.

## Installation

```bash
pnpm add @ialeks/zod-decorator zod reflect-metadata
```

```bash
npm install @ialeks/zod-decorator zod reflect-metadata
```

```bash
yarn add @ialeks/zod-decorator zod reflect-metadata
```

Enable decorators in `tsconfig.json` (`experimentalDecorators` / `emitDecoratorMetadata` as required by your setup). Import `reflect-metadata` once at app entry (e.g. `import "reflect-metadata"`). **Zod** is a peer dependency: keep a single `zod` install in your app (see `peerDependencies` in this package).

The package is **ESM** (`"type": "module"`). Use `import` syntax in Node and bundlers that support native ESM.

## Quick start

```ts
import "reflect-metadata";
import { Schema, IsString, IsNumber, IsOptional, toZodSchema, validate } from "@ialeks/zod-decorator";

@Schema()
class UserDto {
  @IsString({ email: true })
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsNumber({ int: true, positive: true })
  age!: number;
}

const schema = toZodSchema(UserDto);
const user = validate(UserDto, { email: "a@b.com", age: 1 });
```

### Reverse: Zod object → class

```ts
import { z } from "zod";
import { fromZodSchema, toZodSchema, validate } from "@ialeks/zod-decorator";

const UserSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
});

const User = fromZodSchema(UserSchema, "User");
const schema = toZodSchema(User);
validate(User, { id: "1" });
```

## API reference

### Decorators

| Decorator | Description | Options |
|----------------|-------------|---------|
| `@Schema()` | Marks a class as a schema source (metadata marker). | — |
| `@IsString(opts?)` | `z.string()` with refinements. | `min`, `max`, `length`, `email`, `url`, `uuid`, `regex`, `trim`, `toLowerCase`, `toUpperCase`, `startsWith`, `endsWith`, `message` |
| `@IsNumber(opts?)` | `z.number()` chain. | `int`, `positive`, `negative`, `nonnegative`, `min`, `max`, `finite`, `multipleOf`, `message` |
| `@IsBoolean(opts?)` | `z.boolean()`. | `message` |
| `@IsDate(opts?)` | `z.date()`. | `min`, `max` (`Date`), `message` |
| `@IsEnum(values, opts?)` | String tuple or native enum via `z.enum` / `z.nativeEnum`. | `readonly string[]` or `z.EnumLike`; `opts`: `message` |
| `@IsArray(opts?)` | `z.array(...)`. | `items` (factory returning `z.ZodTypeAny`, default `z.unknown()`), `elementClass` (lazy class ctor when `items` is omitted — for nested DTO arrays + Nest `transform`; ignored if `items` is set), `min`, `max`, `nonempty`, `message` |
| `@Nested(classFn)` | Nested object from another decorated class; `classFn` is `() => Constructor`. | — |
| `@IsOptional()` | Wraps field with `.optional()`. | — |
| `@IsNullable()` | Wraps field with `.nullable()`. | — |
| `@Default(value)` | `.default(value)`. | `unknown` |
| `@Transform(fn)` | Appends `schema.transform(fn)`. | `(val: unknown) => unknown` |
| `@Refine(check, opts?)` | Appends `.refine` with optional `message`. | `check: (val: unknown) => boolean`, `opts?: { message?: string }` |

### Schema builders

| Function | Signature | Notes |
|----------|-----------|--------|
| `toZodSchema` | `toZodSchema<T>(cls: new (...args: unknown[]) => T): z.ZodObject<Record<string, z.ZodTypeAny>>` | Builds `z.object` from class metadata. |
| `validate` | `validate<T>(cls, data: unknown): T` | `toZodSchema(cls).parse(data)`. Throws `ZodError` with paths and input snippets; map or strip at trust boundaries before exposing to clients. |
| `validateSafe` | `validateSafe<T>(cls, data: unknown): z.SafeParseReturnType<unknown, T>` | `toZodSchema(cls).safeParse(data)`. |
| `fromZodSchema` | `fromZodSchema<T extends z.ZodObject<z.ZodRawShape>>(schema: T, name?: string): new () => z.infer<T>` | Generates a class with `registerField` metadata from an existing Zod object shape (optional unwrap of optional/nullable/default; nested objects). |

### Nest subpath (`@ialeks/zod-decorator/nest`)

Import only from `@ialeks/zod-decorator` (root) or `@ialeks/zod-decorator/nest` — these match `package.json` `exports`; avoid deep imports from `dist/`.

| Export | Role |
|--------|------|
| `ZodValidationPipe` | Nest `PipeTransform` using `safeParse` + optional `plainToInstance` when `transform: true`. |
| `ZodValidationPipeOptions` | `transform?`, `errorFactory?(error: ZodError) => Error` (prefer `HttpException` for correct HTTP status). |
| `plainToInstance` | Builds class instances from plain objects using field metadata (same helper the pipe uses when `transform: true`). |
| `redactZodIssuesForResponse` | Strips `input` / `received` / `params` / `keys` from Zod issues (default pipe errors use this; reuse in custom `errorFactory` if you spread issues). |

### Constants

| Export | Description |
|--------|-------------|
| `VERSION` | Package version string (aligned with `package.json`). |

`IsStringOptions`, `IsNumberOptions`, `IsDateOptions`, `IsArrayOptions`, `IsBooleanOptions`, `IsEnumOptions`, and `FieldMeta` are exported for typing helpers. Per-constraint message types (`IsStringMessages`, `IsNumberMessages`, `IsDateMessages`, `IsArrayMessages`) are also exported.

### Custom error messages

Every type decorator accepts a `message` option to customize Zod error messages. Pass a string for the base type error, or an object to target individual constraints:

```ts
class SignupDto {
  @IsString({
    email: true,
    min: 5,
    message: { base: "Must be a string", email: "Invalid email", min: "Too short" },
  })
  email!: string;

  @IsNumber({ positive: true, message: "Must be a number" })
  age!: number;

  @IsEnum(["admin", "user"] as const, { message: "Pick admin or user" })
  role!: string;
}
```

When `message` is a string, it applies to the base type check. When it is an object, each key maps to its constraint (e.g. `min`, `max`, `email`, `int`). The special `base` key in the object form sets the type-level error alongside per-constraint messages.

### Behavior notes

- **Instance vs static properties:** Use decorators on **instance** properties for typical DTOs. **Static** properties are now supported: metadata is stored on the declaring class (not confused with `Function`). Prefer instance fields unless you intentionally model class-level values.
- **`@Refine` / `@Transform` pipeline:** For each field, `toZodSchema` runs **all** `.refine()` steps first (in registration order), then **all** `.transform()` steps (in registration order). It does not interleave them in source order; use Zod directly if you need a different chain order.
- **`toZodSchema` and inheritance:** `getFields` walks the prototype chain; a subclass field with the same name as a parent **overrides** the parent’s metadata for that key.
- **`@IsString` option order:** `trim` and case options run **before** `min` / `max` / `length` and format checks, so length counts the normalized string.
- **`fromZodSchema` / `toZodSchema` roundtrip:** Classes produced by `fromZodSchema` store object-level options (`strict` / `passthrough` / `catchall`) in metadata and `toZodSchema` reapplies them; schemas built only from decorators still emit a plain `z.object(shape)` unless you set those options yourself. Field-level validations that live only on unsupported wrapper types (e.g. some `ZodEffects` chains) may not round-trip. **`ZodOptional` / `ZodNullable` / `ZodDefault`:** `fromZodSchema` records wrapper order (and default factories without evaluating them) so round-trip restores the same parse behavior; classes built only from decorators still apply optional / nullable / default in the fixed pipeline order documented for `toZodSchema`.
- **`@Refine`:** Refinement callbacks must be **synchronous**. Use Zod directly for async refinements (`parseAsync` / `superRefine`).

## class-validator vs zod-decorator

**class-validator** (imperative style with `class-validator` + `class-transformer`):

```ts
import { IsEmail, IsOptional, IsString, IsInt, Min } from "class-validator";

class UserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsInt()
  @Min(1)
  age!: number;
}
```

**zod-decorator** (decorators → Zod schema):

```ts
import { Schema, IsString, IsNumber, IsOptional, toZodSchema } from "@ialeks/zod-decorator";

@Schema()
class UserDto {
  @IsString({ email: true })
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsNumber({ int: true, positive: true })
  age!: number;
}

const schema = toZodSchema(UserDto); // full Zod object, composable with the rest of Zod
```

Both keep validation colocated on the class; zod-decorator outputs a real Zod schema for `parse` / `safeParse` / inference and interoperability with `zod`’s APIs.

| Concern | class-validator stack | zod-decorator |
|---------|------------------------|---------------|
| Nest request validation | `ValidationPipe` + `class-validator` (+ often `class-transformer` for `transform: true`) | `ZodValidationPipe` from `@ialeks/zod-decorator/nest`: Zod `safeParse` on the DTO class, optional `plainToInstance` when `transform: true` |

## NestJS integration

Install the usual peers (`zod`, `reflect-metadata`). For the Nest subpath, add **`@nestjs/common`** and **`rxjs`** to your app—they are optional peers of this package and required at runtime when you import `@ialeks/zod-decorator/nest`.

```bash
pnpm add @ialeks/zod-decorator zod reflect-metadata @nestjs/common rxjs
```

Wire validation globally or per route. Use `transform: true` when you want body/query DTO properties to be real class instances (including nested DTOs), similar to `ValidationPipe`’s `transform` option.

**Passthrough (no Zod run):** `metadata.metatype` is missing, or is `String` / `Number` / `Boolean` / `Array` / `Object`, the value is returned unchanged. If the metatype is a class with **no** registered fields and **no** `@Schema()` marker, the value is returned unchanged. Otherwise the pipe runs `safeParse` and throws `BadRequestException` on failure. A class with `@Schema()` but no `@Is*` fields still validates as an empty Zod object (unknown keys are stripped by default, same as `z.object({})`). If a handler parameter is typed as a bare `object` / `Record<...>` or an interface, or `emitDecoratorMetadata` does not emit a class constructor, Nest may supply `Object` or `undefined` as the metatype and **Zod will not run**—same class of footgun as Nest’s built-in `ValidationPipe`.

**Error bodies:** the default `BadRequestException` response includes `errors` with Zod issue metadata but **without** `input` / `received` / `params` / `keys` (strict-object unknown keys), so raw request values, custom `addIssue` payloads, and client-supplied extra property names are not echoed. Use `redactZodIssuesForResponse` in a custom `errorFactory` if you build your own payload from `error.issues`. With `transform: true`, a `TypeError` from `plainToInstance` (shape mismatch or `maxTransformDepth` exceeded) is turned into a 400 with the same `message: "Validation failed"` shape. `ZodValidationPipe` accepts `maxTransformDepth` (default 512; use `Number.POSITIVE_INFINITY` to disable the cap) and passes it to `plainToInstance`.

```ts
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ZodValidationPipe } from "@ialeks/zod-decorator/nest";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ZodValidationPipe());
  await app.listen(3000);
}
bootstrap();
```

```ts
import { Schema, IsString, Nested } from "@ialeks/zod-decorator";
import { ZodValidationPipe } from "@ialeks/zod-decorator/nest";
import { Body, Controller, Post, UsePipes } from "@nestjs/common";

@Schema()
class AddressDto {
  @IsString()
  city!: string;
}

@Schema()
class CreateUserDto {
  @IsString()
  name!: string;

  @Nested(() => AddressDto)
  address!: AddressDto;
}

@Controller("users")
export class UsersController {
  @Post()
  @UsePipes(new ZodValidationPipe({ transform: true }))
  create(@Body() body: CreateUserDto) {
    // body.address instanceof AddressDto
  }
}
```

Custom `errorFactory`: reshape `ZodError` before Nest turns it into a response—for example, turn each issue’s `path` (`unknown[]`) into a single dotted string for clients that expect a flat key.

```ts
import { BadRequestException } from "@nestjs/common";
import { ZodValidationPipe, redactZodIssuesForResponse } from "@ialeks/zod-decorator/nest";
import type { ZodError } from "zod";

function pathToDotted(path: unknown[]): string {
  return path.reduce<string>((acc, segment) => {
    if (typeof segment === "number") return acc ? `${acc}[${segment}]` : `[${segment}]`;
    const key = String(segment);
    return acc ? `${acc}.${key}` : key;
  }, "");
}

new ZodValidationPipe({
  errorFactory: (error: ZodError) =>
    new BadRequestException({
      statusCode: 400,
      message: "Validation failed",
      errors: redactZodIssuesForResponse(error.issues).map((issue) => ({
        ...issue,
        path: pathToDotted(issue.path),
      })),
    }),
});
```

**Not a full `class-transformer` replacement:** `@Expose`, `@Exclude`, serialization `groups`, and other class-transformer–centric serialization features are out of scope here. Shape and strip data with Zod (`schema.pick`, `schema.omit`, `.transform`) and this library’s `@Transform` on fields where you need parse-time transforms.

## Contributing

Issues and pull requests are welcome. Please run `pnpm build` and `pnpm test` before submitting changes.

## License

MIT — see [LICENSE](./LICENSE).
