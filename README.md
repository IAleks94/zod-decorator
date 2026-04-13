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
| `@IsString(opts?)` | `z.string()` with refinements. | `min`, `max`, `length`, `email`, `url`, `uuid`, `regex`, `trim`, `toLowerCase`, `toUpperCase`, `startsWith`, `endsWith` |
| `@IsNumber(opts?)` | `z.number()` chain. | `int`, `positive`, `negative`, `nonnegative`, `min`, `max`, `finite`, `multipleOf` |
| `@IsBoolean()` | `z.boolean()`. | — |
| `@IsDate(opts?)` | `z.date()`. | `min`, `max` (`Date`) |
| `@IsEnum(values)` | String tuple or native enum via `z.enum` / `z.nativeEnum`. | `readonly string[]` or `z.EnumLike` |
| `@IsArray(opts?)` | `z.array(...)`. | `items` (factory returning `z.ZodTypeAny`, default `z.unknown()`), `min`, `max`, `nonempty` |
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

### Constants

| Export | Description |
|--------|-------------|
| `VERSION` | Package version string (aligned with `package.json`). |

`IsStringOptions`, `IsNumberOptions`, `IsDateOptions`, `IsArrayOptions`, and `FieldMeta` are exported for typing helpers.

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

## NestJS integration

NestJS often uses `class-validator` with `ValidationPipe`. A future direction is a small helper (e.g. `createDto(schemaClass)`) that wires `toZodSchema` into a Nest `Pipe` or custom middleware so DTOs stay decorator-driven while validation runs through Zod. This is not shipped yet; track releases for integration examples.

## Contributing

Issues and pull requests are welcome. Please run `pnpm build` and `pnpm test` before submitting changes.

## License

MIT — see [LICENSE](./LICENSE).
