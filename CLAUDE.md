# zod-decorator — agent notes

## Project layout

- Library sources live under `src/`; tests are `*.spec.ts` (Vitest) and are excluded from `tsc` via `tsconfig.json`, so `dist/` ships only library code.
- Entry point: `src/index.ts` re-exports decorators, `toZodSchema` / `validate` / `validateSafe`, `fromZodSchema`, `VERSION`, and `FieldMeta`.
- `src/nest/` compiles to `dist/nest/` and is exposed only via the package subpath `@ialeks/zod-decorator/nest` (`exports["./nest"]`); `@nestjs/common` and `rxjs` are optional peer dependencies for consumers of that entry.

## Runtime requirements

- Consumers must load `reflect-metadata` once before decorators run (e.g. `import "reflect-metadata"` at app entry).
- `tsconfig` needs `experimentalDecorators` and `emitDecoratorMetadata` for decorator metadata used by `reflect-metadata`.

## Metadata model

- `registerField` stores `FieldMeta` on the **constructor** via `Reflect.defineMetadata(SCHEMA_FIELDS, ...)`.
- `getFields(cls)` walks the prototype chain (child constructors after parents) and merges fields; same `propertyKey` on a child overrides the parent.
- `SCHEMA_MARKER` / `@Schema()` is a **marker** only; the runtime does not require it for `toZodSchema` (it is for documentation and convention).

## Per-field pipeline (`applyFieldMeta`)

Order applied to each field’s base schema from `factory()`:

1. `refinements` — `.refine` (sync checks only in the public API)
2. `transforms` — each function receives the current Zod schema and returns the next schema
3. Wrappers: if `FieldMeta.wrapperChain` is set (from `fromZodSchema`), reapply each step inner-to-outer (reverse of stored peel order) via `.optional()`, `.nullable()`, or `.default(factory)`. Otherwise the decorator pipeline applies `.optional()` if `isOptional`, `.nullable()` if `isNullable`, `.default(value)` if `defaultValue !== undefined`.

## `@Nested` and cycles

- Nested object fields use `z.lazy(() => toZodSchema(classFn()))` so mutually nested classes do not overflow the stack during schema construction.

## Commands

- `pnpm` — install dependencies
- `pnpm build` — `tsc` to `dist/`
- `pnpm test` — `vitest run` (all `src/**/*.spec.ts`)

## Module format

- Package is ESM (`"type": "module"`). Use `import` in consumers.
