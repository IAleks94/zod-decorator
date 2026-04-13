# zod-decorator

[![npm version](https://img.shields.io/npm/v/zod-decorator.svg)](https://www.npmjs.com/package/zod-decorator)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)

TypeScript decorators for **Zod** schema validation. If you like the **class-validator** developer experience (decorating class properties) but want Zod’s runtime types, inference, and ecosystem, this library bridges the two: decorators register metadata, then `toZodSchema` builds a `z.object()` you can parse, compose, and reuse like any other Zod schema.

## Installation

```bash
pnpm add zod-decorator zod reflect-metadata
```

```bash
npm install zod-decorator zod reflect-metadata
```

```bash
yarn add zod-decorator zod reflect-metadata
```

Enable decorators in `tsconfig.json` (`experimentalDecorators` / `emitDecoratorMetadata` as required by your setup). Import `reflect-metadata` once at app entry (e.g. `import "reflect-metadata"`).

## Quick start

```ts
import "reflect-metadata";
import { Schema, IsString, IsNumber, IsOptional, toZodSchema, validate } from "zod-decorator";

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
| `@Refine(check, opts?)` | Appends `.refine` with optional `message`. | `check: (val: unknown) => unknown`, `opts?: { message?: string }` |

### Schema builders

| Function | Signature | Notes |
|----------|-----------|--------|
| `toZodSchema` | `toZodSchema<T>(cls: new (...args: unknown[]) => T): z.ZodObject<Record<string, z.ZodTypeAny>>` | Builds `z.object` from class metadata. |
| `validate` | `validate<T>(cls, data: unknown): T` | `toZodSchema(cls).parse(data)`. |
| `validateSafe` | `validateSafe<T>(cls, data: unknown): z.SafeParseReturnType<unknown, T>` | `toZodSchema(cls).safeParse(data)`. |
| `fromZodSchema` | `fromZodSchema<T extends z.ZodObject<z.ZodRawShape>>(schema: T, name?: string): new () => z.infer<T>` | Generates a class with `registerField` metadata from an existing Zod object shape (optional unwrap of optional/nullable/default; nested objects). |

## class-validator vs zod-decorator

**class-validator** (imperative style with `class-validator` + `class-transformer`):

```ts
import { IsEmail, IsOptional, IsInt, Min } from "class-validator";

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
import { Schema, IsString, IsNumber, IsOptional } from "zod-decorator";

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
