# Plan: zod-decorator MVP

## Overview
Implement the zod-decorator library -- a TypeScript decorator-based wrapper around Zod that brings class-validator DX to Zod schema validation. Includes metadata store, type/modifier decorators, bidirectional schema builders (toZodSchema + fromZodSchema), comprehensive tests, and README.

## Validation Commands
- `pnpm build`
- `pnpm test`

### Task 1: Project setup and dependency installation
- [ ] Run `pnpm install` in the project root to install all dependencies from package.json (zod, reflect-metadata, typescript, vitest)
- [ ] Create a minimal `src/index.ts` that exports a placeholder (e.g. `export const VERSION = "0.1.0"`)
- [ ] Verify `pnpm build` compiles successfully and produces `dist/index.js`
- [ ] Verify `pnpm test` runs without errors (no test files yet is OK)
- [ ] Mark completed

### Task 2: Metadata store
- [ ] Create `src/metadata.ts` with the `FieldMeta` interface containing: `propertyKey: string`, `factory: () => z.ZodTypeAny`, `isOptional: boolean`, `isNullable: boolean`, `defaultValue: unknown | undefined`, `transforms: Array<(schema: z.ZodTypeAny) => z.ZodTypeAny>`, `refinements: Array<{ check: (val: unknown) => unknown, message?: string }>`
- [ ] Define `SCHEMA_FIELDS` as a unique Symbol key for storing metadata
- [ ] Define `SCHEMA_MARKER` as a unique Symbol key for `@Schema()` class marker
- [ ] Implement `registerField(target: object, propertyKey: string, meta: Partial<FieldMeta>)` that merges partial metadata into the existing `FieldMeta[]` array on the constructor using `Reflect.getMetadata` / `Reflect.defineMetadata`. If a field with the same `propertyKey` already exists, merge properties (not replace)
- [ ] Implement `getFields(cls: new (...args: unknown[]) => unknown): FieldMeta[]` that reads metadata and walks the prototype chain to collect fields from parent classes, with child fields overriding parent fields of the same name
- [ ] Export all from `src/metadata.ts`
- [ ] Verify `pnpm build` passes
- [ ] Mark completed

### Task 3: Type decorators
- [ ] Create `src/decorators/schema.ts` with `@Schema()` class decorator that sets `SCHEMA_MARKER` metadata on the class
- [ ] Create `src/decorators/string.ts` with `@IsString(opts?)` decorator. Options interface: `{ min?: number, max?: number, length?: number, email?: boolean, url?: boolean, uuid?: boolean, regex?: RegExp, trim?: boolean, toLowerCase?: boolean, toUpperCase?: boolean, startsWith?: string, endsWith?: string }`. Build the `z.string()` chain from options and call `registerField()`
- [ ] Create `src/decorators/number.ts` with `@IsNumber(opts?)` decorator. Options interface: `{ int?: boolean, positive?: boolean, negative?: boolean, nonnegative?: boolean, min?: number, max?: number, finite?: boolean, multipleOf?: number }`. Build `z.number()` chain from options and call `registerField()`
- [ ] Create `src/decorators/boolean.ts` with `@IsBoolean()` decorator that registers `z.boolean()` via `registerField()`
- [ ] Create `src/decorators/date.ts` with `@IsDate(opts?)` decorator. Options: `{ min?: Date, max?: Date }`. Build `z.date()` chain and call `registerField()`
- [ ] Create `src/decorators/enum.ts` with `@IsEnum(values)` decorator that takes a `z.EnumLike` or array of string values and registers `z.enum()` or `z.nativeEnum()` via `registerField()`
- [ ] Create `src/decorators/array.ts` with `@IsArray(opts?)` decorator. Options: `{ items?: () => z.ZodTypeAny, min?: number, max?: number, nonempty?: boolean }`. Build `z.array()` chain and call `registerField()`. If no `items` provided, default to `z.unknown()`
- [ ] Create `src/decorators/nested.ts` with `@Nested(classFn)` decorator that takes a lazy `() => Constructor` factory, calls `toZodSchema()` on it at schema build time (import lazily to avoid circular deps), and registers via `registerField()`
- [ ] Create `src/decorators/index.ts` barrel that re-exports all decorators
- [ ] Verify `pnpm build` passes
- [ ] Mark completed

### Task 4: Modifier decorators
- [ ] Create `src/decorators/modifiers.ts` with `@IsOptional()` decorator that calls `registerField()` with `{ isOptional: true }`
- [ ] Add `@IsNullable()` decorator that calls `registerField()` with `{ isNullable: true }`
- [ ] Add `@Default(value: unknown)` decorator that calls `registerField()` with `{ defaultValue: value }`
- [ ] Add `@Transform(fn: (val: unknown) => unknown)` decorator that appends the transform function to the `transforms` array in `FieldMeta`
- [ ] Add `@Refine(check: (val: unknown) => unknown, opts?: { message?: string })` decorator that appends to the `refinements` array in `FieldMeta`
- [ ] Export all modifiers from `src/decorators/index.ts`
- [ ] Verify `pnpm build` passes
- [ ] Mark completed

### Task 5: Schema builder -- toZodSchema
- [ ] Create `src/schema-builder.ts` with `toZodSchema<T>(cls: new (...args: unknown[]) => T): z.ZodObject<Record<string, z.ZodTypeAny>>`. Implementation: call `getFields(cls)`, iterate fields, for each field call `field.factory()` to get the base schema, then apply refinements via `.refine()`, transforms via `.transform()`, `.optional()` if `isOptional`, `.nullable()` if `isNullable`, `.default()` if `defaultValue` is set. Build shape object and return `z.object(shape)`
- [ ] Add `validate<T>(cls: new (...args: unknown[]) => T, data: unknown): z.infer<...>` as a shortcut for `toZodSchema(cls).parse(data)`
- [ ] Add `validateSafe<T>(cls: new (...args: unknown[]) => T, data: unknown): z.SafeParseReturnType<...>` as a shortcut for `toZodSchema(cls).safeParse(data)`
- [ ] Update `src/index.ts` to export everything: all decorators from `src/decorators/index.ts`, `toZodSchema`, `validate`, `validateSafe` from `src/schema-builder.ts`, `FieldMeta` type from `src/metadata.ts`
- [ ] Verify `pnpm build` passes
- [ ] Mark completed

### Task 6: Reverse builder -- fromZodSchema
- [ ] Create `src/schema-from-zod.ts` with `fromZodSchema<T extends z.ZodObject<z.ZodRawShape>>(schema: T, name?: string): new () => z.infer<T>`. Implementation: create a new class dynamically (using `name` for the class name if provided), iterate `schema.shape`, for each field unwrap wrapper types (`ZodOptional` -> set isOptional, `ZodNullable` -> set isNullable, `ZodDefault` -> set defaultValue) to get the inner type, then call `registerField()` with a factory that returns the original Zod field schema (preserving all validations). Return the class constructor
- [ ] Handle unwrapping of: `z.ZodOptional` (via `._def.innerType`), `z.ZodNullable` (via `._def.innerType`), `z.ZodDefault` (via `._def.innerType` + `._def.defaultValue()`)
- [ ] Handle nested `z.ZodObject` fields by recursively calling `fromZodSchema` for nested objects
- [ ] Handle `z.ZodArray` fields by preserving the full array schema in the factory
- [ ] Export `fromZodSchema` from `src/index.ts`
- [ ] Verify `pnpm build` passes
- [ ] Mark completed

### Task 7: Decorator unit tests
- [ ] Create `src/decorators/__tests__/string.spec.ts` testing `@IsString()` with all options: basic string, min, max, length, email, url, uuid, regex, trim, toLowerCase, toUpperCase, startsWith, endsWith. Verify each option produces correct validation behavior (accepts valid, rejects invalid)
- [ ] Create `src/decorators/__tests__/number.spec.ts` testing `@IsNumber()` with: basic number, int, positive, negative, nonnegative, min, max, finite, multipleOf
- [ ] Create `src/decorators/__tests__/boolean.spec.ts` testing `@IsBoolean()` accepts true/false, rejects non-booleans
- [ ] Create `src/decorators/__tests__/date.spec.ts` testing `@IsDate()` with: basic date, min, max
- [ ] Create `src/decorators/__tests__/enum.spec.ts` testing `@IsEnum()` with string arrays and native TS enums
- [ ] Create `src/decorators/__tests__/array.spec.ts` testing `@IsArray()` with: basic array, items type, min, max, nonempty
- [ ] Create `src/decorators/__tests__/nested.spec.ts` testing `@Nested()` with nested classes and forward reference factories
- [ ] Create `src/decorators/__tests__/modifiers.spec.ts` testing `@IsOptional()`, `@IsNullable()`, `@Default()`, `@Transform()`, `@Refine()` and their composition with type decorators in both orders
- [ ] Verify `pnpm test` passes with all tests green
- [ ] Mark completed

### Task 8: Schema builder and fromZodSchema tests
- [ ] Create `src/__tests__/schema-builder.spec.ts` with integration tests: a full class with mixed decorators (@IsString + @IsOptional + @IsNumber + @Nested + @IsArray), verify `toZodSchema()` produces correct schema, `validate()` accepts valid data and rejects invalid data, `validateSafe()` returns success/error results
- [ ] Create `src/__tests__/schema-from-zod.spec.ts` with tests: basic roundtrip (`toZodSchema(fromZodSchema(schema))` produces equivalent validation), unwrapping optionals/nullables/defaults, nested object roundtrip, extending a fromZodSchema class with additional decorators
- [ ] Create `src/__tests__/edge-cases.spec.ts` with tests: class inheritance (child extends parent, both have decorators), decorator ordering (@IsOptional before vs after @IsString), multiple decorators on same field (last type wins, modifiers merge), empty class produces empty z.object({})
- [ ] Verify `pnpm test` passes with all tests green
- [ ] Mark completed

### Task 9: README
- [ ] Write `README.md` with sections: project title and badges (npm, license, build), one-paragraph motivation (class-validator DX + Zod power), installation instructions (pnpm/npm/yarn), quick start example showing a decorated class with toZodSchema/validate
- [ ] Add API reference section: table of all decorators with their options, toZodSchema/validate/validateSafe signatures, fromZodSchema signature and usage example
- [ ] Add comparison section: side-by-side class-validator vs zod-decorator code
- [ ] Add section on NestJS integration (future roadmap hint with createDto utility)
- [ ] Add Contributing and License sections
- [ ] Mark completed
