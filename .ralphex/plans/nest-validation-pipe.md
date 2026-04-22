# Plan: NestJS ValidationPipe subpath export

## Overview
Add a NestJS-friendly subpath `@ialeks/zod-decorator/nest` that exports `ZodValidationPipe` and `plainToInstance`, so decorated DTO classes can replace `class-validator + class-transformer` inside Nest controllers. The root entry (`@ialeks/zod-decorator`) stays Nest-free; `@nestjs/common` and `rxjs` are optional peer dependencies.

## Validation Commands
- `pnpm build`
- `pnpm test`

### Task 1: Package scaffolding for subpath export
- [x] Add `@nestjs/common` (`^9 || ^10 || ^11`) and `rxjs` (`^7`) to `peerDependencies` in `package.json`
- [x] Add `peerDependenciesMeta` with `{ "optional": true }` for both peers
- [x] Add `@nestjs/common`, `@nestjs/core`, `@nestjs/testing`, `rxjs` to `devDependencies`
- [x] Replace `"main"` / `"types"` with an `"exports"` map exposing `.` (root) and `./nest` (dist/nest/index.js + .d.ts); keep `main` and `types` as legacy fallbacks pointing to `./dist/index.js` and `./dist/index.d.ts`
- [x] Add `"typesVersions": { "*": { "nest": ["./dist/nest/index.d.ts"] } }` for TS resolvers older than 4.7
- [x] Run `pnpm install` to regenerate `pnpm-lock.yaml`
- [x] Run `pnpm build` to verify root still compiles (no `src/nest/` yet)
- [x] Run `pnpm test` to verify existing tests still pass
- [x] Mark completed

### Task 2: Extend FieldMeta for plainToInstance hints
- [ ] In `src/metadata.ts`, extend `FieldMeta` interface with optional `nestedClass?: () => new (...args: unknown[]) => unknown` and `elementClass?: () => new (...args: unknown[]) => unknown`
- [ ] Update `defaultFieldMeta` and `mergeFieldMeta` in `src/metadata.ts` to preserve the two new fields across registrations (similar to how `wrapperChain` is handled)
- [ ] In `src/decorators/nested/nested.ts`, pass `nestedClass: classFn` to `registerField` so `@Nested(() => Child)` records the constructor thunk
- [ ] In `src/decorators/array/array.ts`, accept an optional form of `options.items` that returns a decorated class constructor (e.g. via an `elementClass` factory or a marker), and pass `elementClass` to `registerField` while keeping the existing `items: () => z.ZodTypeAny` form working unchanged
- [ ] Add unit assertions in `src/__tests__/metadata.spec.ts` that `nestedClass` / `elementClass` survive merging and inheritance via `getFields`
- [ ] Run `pnpm build` and `pnpm test`; all existing `schema-builder` / `schema-from-zod` / `edge-cases` specs must still pass unchanged
- [ ] Mark completed

### Task 3: Implement plainToInstance helper
- [ ] Create `src/nest/plain-to-instance.ts` exporting `plainToInstance<T>(cls: new (...args: unknown[]) => T, data: unknown): T`
- [ ] Use `Object.create(cls.prototype)` + `Object.assign` (do not call `new cls()` to avoid required-arg constructors)
- [ ] Iterate `getFields(cls)`; for fields with `nestedClass`, recurse into the value; for fields with `elementClass`, recurse into each array element; leave other fields as-is
- [ ] Preserve `null`, skip `undefined`, keep plain primitives intact
- [ ] Add `src/__tests__/plain-to-instance.spec.ts` covering: flat DTO → `instanceof`, `@Nested` → nested `instanceof`, array of `@Nested` → every element `instanceof`, DTO with required-args constructor does not throw, `null` value survives, missing optional fields survive
- [ ] Run `pnpm build` and `pnpm test`
- [ ] Mark completed

### Task 4: Implement ZodValidationPipe
- [ ] Create `src/nest/zod-validation-pipe.ts` with `ZodValidationPipeOptions { transform?: boolean; errorFactory?: (error: ZodError) => Error }` and `ZodValidationPipe implements PipeTransform<unknown>`
- [ ] In `transform(value, metadata)`: return `value` unchanged when `metadata.metatype` is undefined or one of `String | Number | Boolean | Array | Object`
- [ ] Skip (return value) when `getFields(metatype)` is empty and `SCHEMA_MARKER` metadata is absent
- [ ] Cache `toZodSchema(metatype)` in a module-level `WeakMap<Constructor, ZodObject>` so the same metatype does not rebuild the schema per request
- [ ] On `safeParse` failure, throw `errorFactory(error)` when provided, otherwise `new BadRequestException({ statusCode: 400, message: "Validation failed", errors: error.issues })`
- [ ] When `transform: true`, return `plainToInstance(metatype, parsed)`; otherwise return `parsed`
- [ ] Add `src/__tests__/zod-validation-pipe.spec.ts` using `@nestjs/testing` with: success path, failure → `BadRequestException` with `message === "Validation failed"` and `errors === error.issues` (message strings from `@IsString({ message })` preserved verbatim), primitive `metatype` passthrough, undecorated class passthrough, `transform: true` → root `instanceof DTO`, `transform: true` → nested `@Nested` `instanceof`, `transform: true` → array of `@Nested` elements all `instanceof`, `transform: true` on DTO with required-args constructor does not throw, custom `errorFactory` is invoked, schema cache returns the same reference across calls on one class
- [ ] Run `pnpm build` and `pnpm test`
- [ ] Mark completed

### Task 5: Wire up nest barrel and verify subpath export
- [ ] Create `src/nest/index.ts` exporting `ZodValidationPipe`, `ZodValidationPipeOptions`, `plainToInstance`
- [ ] Do NOT add any `export * from "./nest/*"` to `src/index.ts` — keep root entry Nest-free
- [ ] Add `src/__tests__/subpath-export.spec.ts` that reads `package.json` at runtime (via `node:fs/promises`) and asserts: `exports["."].import === "./dist/index.js"`, `exports["./nest"].import === "./dist/nest/index.js"`, both `types` paths match, and `typesVersions["*"].nest[0] === "./dist/nest/index.d.ts"`
- [ ] In the same spec, after checking the config, `await import("../../dist/nest/index.js")` (vitest runs tests from built `src/`; the relative path from `src/__tests__/` to `dist/nest/` is stable) and assert `ZodValidationPipe` is a class and `plainToInstance` is a function; prefix the spec with a top-level check that skips gracefully if `dist/nest/index.js` is missing so the spec does not block the first `pnpm test` run before `pnpm build`
- [ ] Run `pnpm build` then `pnpm test` and confirm the subpath-export spec passes
- [ ] Mark completed

### Task 6: Documentation updates
- [ ] Add a `## NestJS integration` section to `README.md` showing installation, `import { ZodValidationPipe } from "@ialeks/zod-decorator/nest"`, `app.useGlobalPipes(new ZodValidationPipe())`, and `@UsePipes(new ZodValidationPipe({ transform: true }))` with a nested DTO example using `@Nested`
- [ ] Add a short recipe in `README.md` showing a custom `errorFactory` that converts `error.issues[i].path: unknown[]` into a dotted string, for users who want that shape
- [ ] Update the `class-validator vs zod-decorator` section in `README.md` with a row about `ValidationPipe` parity
- [ ] Explicitly note in `README.md` that `@Expose` / `@Exclude` / `groups` / full `class-transformer` serialization are out of scope; point users to Zod (`schema.pick` / `schema.omit` / `.transform`) and the existing `@Transform` decorator
- [ ] Update `CLAUDE.md` with a bullet that `src/nest/` compiles to `dist/nest/` and is exposed via the `./nest` subpath export with `@nestjs/common` and `rxjs` as optional peers
- [ ] Run `pnpm build` and `pnpm test`
- [ ] Mark completed
