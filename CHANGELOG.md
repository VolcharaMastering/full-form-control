# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **Tests:** added a Jest + React Testing Library test suite in a separate `tests/` directory, run against ESM via `ts-jest`'s `useESM` mode. Covers the `FormStore` contract (initial state, `"add"`/`"edit"` modes, `clearFormValues`, `subscribe`/`notify`, `getSnapshot`, `destroy`), every validation adapter from the README (Joi, Zod, Yup, custom, per-field) including config reuse across calls, `useForm` and `useFormStore` rendered with real components matching the README's own examples, and the documented `destroy()`/StrictMode interaction from the "Disposing a store" section (verified with a real `React.StrictMode` render, the same reproduction used to write that section). Tests use their own `tsconfig.test.json` and are never part of `tsc`'s `src`-rooted build or the published `files: ["dist"]`; `npm pack --dry-run` confirms none of `tests/`, `jest.config.js` or `tsconfig.test.json` ship in the package. New `test` and `test:watch` scripts; `typecheck` now also checks `tests/` against `tsconfig.test.json` (Jest's `isolatedModules` transform skips type-checking during the actual test run).
- **Tests:** added regression coverage for the three fixes below: a Yup schema throwing a plain `TypeError` now must propagate out of `setFormValues` instead of being swallowed, and a hand-rolled `FakeFormStore` class that implements `IFormStore<T>` without going through `createFormStore` now renders and updates correctly through `useFormStore`.

### Fixed

- **Types:** `ValidationConfig.type` is now a closed union (`"joi" | "zod" | "yup" | "custom" | "field"`), exported as `ValidationType`. Unreleased tags (`valibot`, `superstruct`, `typia`, `ajv`, `vest`) are commented out until the adapters ship. After install, TypeScript and the editor flag any other tag as an error. JavaScript gets the same check via `// @ts-check` plus helpers `joi`/`zod`/`yup`/`custom`/`field`. `runValidation` no longer uses a `switch`; an unknown tag at runtime throws instead of leaving `isValid` true with no validation.

- **Packaging:** the package failed to load under plain Node ESM (no `"type": "module"` in `package.json`, extensionless relative imports in the compiled output). Added `"type": "module"`, switched `tsconfig.json` to `"module"`/`"moduleResolution": "NodeNext"`, and added explicit `.js` extensions to every relative import in `src/`. Also added the missing `typescript` dev dependency and a `prepublishOnly` script so `dist` is always rebuilt before publish.
- **Behavior:** `FormStore._setFormValues` decided whether to capture the `"edit"` baseline by checking if `formValues` or `defaultData` were empty. This missed the baseline entirely when `initialValues` were non-empty (so `isValid` could become `true` in edit mode before any real change), and could silently drop values typed in `"add"` mode once `"edit"` was used for the first time. Replaced both checks with an explicit `hasEditBaseline` flag, and the baseline now captures the values already merged in the current call instead of the raw payload alone, so no previously entered data is lost.
- **Behavior:** the constructor computed `isValid` from `initialValues` right away, so a store created with non-empty `initialValues` (including placeholder empty strings, since the check only counts keys) reported `isValid: true` before `setFormValues` ever ran. `isValid` now always starts `false` and only reflects the real state once the first `setFormValues` call recomputes it.
- **Bug:** `FormStore.applyField` (used for `type: "field"` validation) mutated `this.errors` in place instead of assigning a new object like every other validation handler does. The `errors` reference never changed for that validation type, so consumers memoizing on `errors` (`useMemo`, a `React.memo` child) could miss updates. `applyField` now builds a fresh errors object and assigns it, matching the other handlers.
- **Bug:** the Joi integration called `schema.validate(formValues)` with no options, so Joi's default `abortEarly: true` reported only the first invalid field. Yup and Zod already report every invalid field. `applyJoi` now calls `schema.validate(formValues, { abortEarly: false })`, and the `"joi"` schema type accepts the same `options` parameter.
- **Bug:** `useFormStoreState` passed `useSyncExternalStore` a fresh `subscribe`/`getSnapshot` wrapper arrow function on every render, so React tore down and re-established the subscription on every render instead of once. `FormStore.subscribe` and `FormStore.getSnapshot` are now stable arrow properties on the instance (same pattern as `setFormValues`), and the hook passes them directly instead of wrapping them.
- **Bug:** calling `setFormValues(partial)` without a `config` after an earlier validated call skipped validation entirely, so `errors` kept describing the old data even after the user fixed the offending field. `FormStore` now remembers the last `config` used and reuses it on calls that omit the argument, so `errors` stays in sync with `formValues`. A store that never receives a `config` is unaffected. `clearFormValues()` also forgets the remembered config.
- **Behavior:** `destroy()` removes every subscriber, including React's own callback registered by `useSyncExternalStore`, so calling it on a still-mounted component (for example from a "reset form" button instead of `clearFormValues()`) silently stopped the component from ever updating again. `setFormValues` and `clearFormValues` now throw a clear error if called after `destroy()`, instead of doing nothing. `destroy()` itself is now idempotent, calling it more than once is a harmless no-op.
- **Bug:** a validation schema that threw an exception (a bug in the schema itself, not a reported validation error) left `formValues` already updated but never called `notify()`, so `getSnapshot()` and React's rendered state kept showing stale data until the next successful call. The thrown-away call's `config` was also still saved as `lastValidationConfig`, so every later call that omitted a `config` reused the broken one and threw too, permanently breaking the store. `setFormValues` now always recomputes `isValid` and notifies subscribers even if the schema throws, and only remembers a `config` for reuse once it has completed without throwing. The exception itself still propagates to the caller.
- **Bug:** `destroy()` called `notify()` (through the shared reset logic) right before clearing its subscriber list, so every subscriber, including the component's own `useSyncExternalStore` callback, was told about the cleared form and re-rendered once for nothing right as the component was unmounting. `destroy()` no longer notifies; `clearFormValues()` still does.
- **Behavior:** `subscribe()` called after `destroy()` threw, which crashed any component that called `destroy()` in a `useEffect` cleanup, since React 18 StrictMode runs effects twice in development (mount, cleanup, mount again) and the second mount subscribes to the same, by-then-destroyed store. `subscribe()` is now a safe no-op after `destroy()` (it logs a `console.warn` and returns a no-op unsubscribe function) instead of throwing. `setFormValues` and `clearFormValues` are unaffected and still throw after `destroy()`.
- **Types:** `FormStoreState<T>`, the return type of `useForm<T>` and `useFormStore<T>`, was defined in `src/react/useFormStoreState.ts` but never re-exported from the package root, so it could not be imported directly (only reconstructed via `ReturnType<typeof useForm<T>>`). It is now exported from `src/index.ts` alongside the other public types.
- **Docs:** the README recommended `useEffect(() => () => destroy(), [])` for cleaning up a `createFormStore` instance, but never warned that this is unsafe for a store the same component keeps using. Verified with a real `react-dom` render in `React.StrictMode` (via `jsdom` + `act`): React runs that effect's cleanup once immediately after mount, before any user interaction, as part of its development-only "mount, cleanup, mount again" check. `destroy()` is irreversible, so that phantom cleanup destroys the store while the component is still mounted, and the very next `setFormValues` call throws. Added a new "Disposing a store" section spelling this out, clarifying that `useForm`'s own store never needs manual disposal, and that `destroy()` should only be called from code outside the mount/unmount cycle of a component still using that store (`clearFormValues()` is the safe choice for a plain per-component reset).

### Added

- **Tooling:** added ESLint (flat config, `typescript-eslint`) and Prettier as dev dependencies, with `lint`, `lint:fix`, `format`, `format:check` and `typecheck` npm scripts.
- **Package metadata:** added `repository`, `homepage`, `bugs`, `engines` (`node >= 18`) and `sideEffects: false` to `package.json`.
- **tsconfig:** enabled `declarationMap` and `sourceMap` (so consumers can step into the original TypeScript source while debugging), `verbatimModuleSyntax`, and `noUncheckedIndexedAccess`. The build was already clean under all four; `noUncheckedIndexedAccess` in particular did not flag the generic `this.formValues[key]` reads in `applyField`/`hasChangesComparedToDefault`, since that check only adds `undefined` for literal index-signature access, not for indexing a generic type parameter by `keyof`.

### Changed

- **Internal:** reformatted every file under `src/` with Prettier per the existing `.prettierrc` (`tabWidth: 4`). `src/core/store.ts` and `src/core/types.ts` were previously written with 2-space indentation while `src/react/*.ts` used 4; the whole directory is now consistent and `npm run format:check` passes. Formatting only, verified with a full regression run and a rebuild that no logic changed.

- **Internal:** removed a dead trailing expression in `FormStore.computeIsValid` that always evaluated to `true` after the early returns above it. No behavior change.
- **Internal:** `src/core/store.ts` no longer re-exports the public validation types a second time; `src/index.ts` already re-exports them from `src/core/types.ts`. No change to the package's public exports.
- **Internal:** `FormStore` used three different method-binding styles: `subscribe`/`getSnapshot` were arrow properties, `setFormValues` was a separate field bound from a private `_setFormValues` in the constructor, and `clearFormValues`/`destroy`/`unsubscribeFromStore` were plain prototype methods. `useFormStoreState` had to wrap the latter three in fresh arrow functions on every render because of that last group. All six are now arrow properties with one consistent pattern, `useFormStoreState` passes every one of them straight through, and the private `_setFormValues` indirection is gone. No change to the public API or behavior, verified with a full regression run including reference-stability checks for all six methods.
- **Repo:** fixed a `.gitignore` typo (`.dist` instead of `dist`) and added `*.tgz`. Stopped tracking the `dist/` build output in git (it stays on disk and is still published; `npm publish` reads local files, not git history, and the `prepublishOnly` script added above already rebuilds it). Removed a stray `full-form-control-0.3.1.tgz` `npm pack` artifact.
- **Packaging:** removed the `main` field from `package.json`. With `"type": "module"` and an `exports` map that only has an `import` condition, the package is ESM-only and `require()` already fails with `ERR_REQUIRE_ESM`; `main` only implied a working CJS entry point that never existed. `exports["."].types`/`.import` and the top-level `types` field already cover every supported resolution path (`npm pack --dry-run` confirms the published file list is unchanged).
- **Docs:** corrected the Zod type block to `path: PropertyKey[]` (was still `(string | number)[]`, out of sync with Zod v4 support and the Joi block next to it). Documented that `"edit"` mode stays sticky for `isValid` computation until `clearFormValues()`, not just for the one-time `defaultData` baseline capture. Documented `FormStore`'s public `formValues`/`defaultData`/`errors`/`isValid` fields as read-only. Documented that `clearFormValues()` also resets the `"add"`/`"edit"` mode. Clarified that only `"field"` validation re-checks a subset of fields; every other validator type re-validates the whole form. Clarified that a module-level store is a client-only pattern and reworded the SSR section's advice on where to create a `createFormStore` instance.
- **Bug:** the Yup adapter (`applyYup`) caught every exception thrown by `validateSync` and routed it through `handleYupError`, which only reads `inner`/`path`/`message`. A genuine bug in the schema (a `TypeError`, a typo, a missing field) threw something without those properties, so `handleYupError` cleared `errors` and returned, silently reporting the form as valid. Every other adapter already lets a schema's own exception propagate to the caller. `applyYup` now checks the exception's shape first and rethrows anything that is not a ValidationError, matching the other adapters.
- **Packaging:** `sourceMap` and `declarationMap` were enabled without shipping the `src/` they point to, so `dist/*.js.map` and `dist/*.d.ts.map` referenced files that did not exist in the published package once installed from npm. Added `"src"` to `files` in `package.json` so both kinds of maps resolve to a real file inside the package (verified by extracting an actual `npm pack` tarball).
- **Types:** `useFormStore` and `useFormStoreState` were typed against the concrete `FormStore<T>` class, so `IFormStore<T>`, listed in the README under "Fully typed public API", could not actually be passed to them (`tsc` rejected it as missing `FormStore`'s private fields). Both hooks now accept `IFormStore<T>`; `FormStore` still implements it, so no existing call site changes.
- **Behavior:** `clearFormValues()` reset `formValues` and `defaultData` to empty objects, discarding the `initialValues` a store was created with, and losing the original baseline for good in an edit form. `FormStore` now keeps a private copy of `initialValues` and `clearFormValues()` restores it instead; `destroy()` still wipes to an empty object, since the store itself is being discarded there. `resetState` also no longer computes `isValid` from the reset data (which could now be non-empty); it is set to `false` directly, for the same reason the constructor already does.
- **Packaging:** none of the modules under `src/react/` had a `"use client"` directive, so a bundler tracing React Server Component boundaries had no per-file signal to keep the React-free `createFormStore` (re-exported from the same `src/index.ts` barrel) out of the client bundle. Added `"use client";` as the first line of `useForm.ts`, `useFormStore.ts` and `useFormStoreState.ts`; the core store modules are unaffected.
- **Docs:** documented `useFormStoreState<T>(store)`, the shared hook `useForm` and `useFormStore` both call internally, and added it to the public API list. Documented that `clearFormValues()` restores `initialValues`, not an empty object. Clarified in "Next.js and SSR" that `createFormStore` can now be imported from server-only code without pulling in `useSyncExternalStore`. Noted in the return-shape table that `useForm` normally has no reason to call the `destroy`/`unsubscribeFromStore` it returns. Warned in "Per-field validators" that `isValid` only reflects fields already validated. Reworded the `errors` table row so it no longer reads as "empty errors implies valid".

### Added

- **Tests:** `tests/react/useClientDirective.test.ts` checks that every module under `src/react/` starts with `"use client"` and that `src/core/store.ts` does not.
- **Docs:** added `DESIGN_NOTES.md`, collecting the reasoning behind non-obvious decisions in `FormStore` (edit baseline tracking, the `isDestroyed`/`subscribe()` StrictMode interaction, arrow-property method binding, and so on) that used to live as long comments inside `src/core/store.ts`. Comments in that file now describe what the code does and point here for background.

### Changed

- **Internal:** trimmed the long, history-explaining comments in `src/core/store.ts` down to short, factual ones, moving the "why" to `DESIGN_NOTES.md`. Deleted a leftover comment describing a type re-export that is not actually present in the file. No behavior change.
- **Internal:** `applyYup` and `handleYupError` both cleared `errors` independently, one on the success branch and one inside the failure handler. `handleYupError` now accepts an optional error (`undefined` on success), matching `handleJoiError`'s shape, so there is a single place that clears `errors` before filling it. No behavior change, covered by the existing Yup tests.
- **Types:** `FormStoreState<T>`'s `clearFormValues`, `destroy` and `unsubscribeFromStore` were spelled out by hand as `() => void`, while `setFormValues` was derived from `IFormStore<T>`. All four are now derived the same way (`IFormStore<T>["..."]`), so the types cannot drift from the interface. No change to the resulting type.
- **Types:** `useForm` and `useFormStore` now declare an explicit `: FormStoreState<T>` return type instead of relying on inference.

### Deprecated

- `unsubscribeFromStore()` (on `FormStore` and on the object returned by `useForm`/`useFormStore`) is targeted for removal in the next major version. Use `destroy()` instead.

## [0.3.1] - 2026-07-15

### Added

- New `useForm<T>(initialValues?)` hook for a single standalone form. Creates and owns its own `FormStore<T>` internally (via `useRef`), so there is no separate `createFormStore` call. Returns the same shape as `useFormStore`: `formValues`, `errors`, `isValid`, `setFormValues`, `clearFormValues`, `destroy`, `unsubscribeFromStore`.

### Changed

- **Behavior:** in "edit" mode (`setFormValues(..., ..., "edit")`) `isValid` stays `false` until at least one field value changes compared to `defaultData`.
- **Types:** updated the Zod shape for v4. `issue.path` is now treated as `PropertyKey[]` (can include `symbol`).
- **Internal:** extracted the shared `useSyncExternalStore` subscription and action-binding logic used by `useFormStore` into `useFormStoreState`, now reused by both `useFormStore` and the new `useForm`. Renamed `src/react/useCustomValidation.ts` to `src/react/useFormStore.ts` to match its actual export. Removed the unused empty `src/react/useBaseValidation.ts`. No change to the public API of `useFormStore` or `createFormStore`.

## [0.3.0] - 2026-04-24

### Added

- New `destroy()` method on `FormStore` with clear dispose semantics: clears form data and removes all subscribers. Also exposed from the `useFormStore` hook.
- Exported the full public type set from the package: `FormSnapshot<T>`, `IFormStore<T>`, `ValidationConfig<T>`, `FieldValidator<Value>`, `FieldValidationSchema<T>`, and `GenericValidationResult`.

### Changed

- **Behavior:** initial `isValid` is now `true` only when the form has at least one key AND there are no errors. Previously a form initialised with an empty object `{}` was reported as valid before any validation ran, which could enable submit buttons by mistake.
- **Internal:** refactored `FormStore.setFormValues` to dispatch through a small `runValidation` + per-library private methods (`applyJoi`, `applyZod`, `applyYup`, `applyGeneric`, `applyField`) instead of a large inline `switch`. No change to the public API.
- **Types:** moved all public types from the ambient `src/core/types.d.ts` into a real module `src/core/types.ts` with `export`. Merged the two previous `IFormStore<T>` declarations and the duplicated `FieldValidator` / `ValidationSchema` into a single coherent set. Dropped the undefined `ObjectSchema<T>` branch and the unused `ValidationSchemaInterface`. Added narrow result types (`JoiValidationResult`, `ZodValidationResult`, `YupValidationError`, `GenericValidationResult`) and wired them through the validation handlers.
- **Types:** `FormStore` and the hook now use `T extends Record<string, unknown>` instead of `Record<string, any>`. Removed the file-wide `eslint-disable @typescript-eslint/no-explicit-any`.

### Deprecated

- `FormStore.unsubscribeFromStore()` is kept as an alias of `destroy()` and marked `@deprecated`. The same alias is available on the `useFormStore` return object. It will be removed in a future major version.

## [0.2.1] - 2026-04-24

### Changed

- Collapsed three `useSyncExternalStore` calls in `useFormStore` into one. The store now caches a single snapshot object `{ formValues, errors, isValid }` and rebuilds it inside `notify()`, so every state change triggers at most one re-render per subscribed component instead of up to three.

### Added

- Exported `FormSnapshot<T>` type from `src/core/store.ts` for consumers who want to type the snapshot directly.
- `FormStore.getSnapshot()` returns the cached snapshot. Stable reference between notifies, fresh reference after every `setFormValues` or `clearFormValues`.

## [0.2.0] - 2026-04-24

### Added

- `createFormStore<T>(initialValues?)` factory in `src/core/store.ts`. Creates a new `FormStore` per form without any React Context.
- `getServerSnapshot` argument in every `useSyncExternalStore` call inside `useFormStore`. The hook is now safe for SSR and React Server Components in Next.js and no longer risks hydration warnings.

### Changed

- **Breaking:** `useFormStore` now takes a `FormStore<T>` instance as an argument. It no longer creates or holds a hidden global store, so multiple forms on one page are fully isolated. Migration: create the store once with `createFormStore` and pass it to the hook in every component that reads or writes that form.

### Removed

- Module-level global `FormStore` instance from `src/react/useCustomValidation.ts`. Every form must now own its own store.

## [0.1.6] - 2025-07-08

### Fixed

- Fixed versioning bug.

### Changed

- Fixed versioning bug.

## [0.1.5] - 2025-06-28

### Fixed

- Improved dependency error handling.
- React added to peerDependencies.

### Changed

- Removed React from dependencies and added it to peerDependencies.

## [0.1.4] - 2025-06-28

### Fixed

- Improved compatibility with Zod and Yup validation schemas.
- Enhanced functionality to support custom validation schemas.

### Changed

- Refactored the validation logic in the store. Removed the universal approach and implemented distinct logic for each type of validation library.

## [0.1.3] - 2025-06-27

### Fixed

- `clearFormValues()` now correctly resets only the form data, not the subscriptions.
- Separated the logic of `clearFormValues` and unsubscribe behavior.
- Introduced a new method `unsubscribeFromStore()` to explicitly clear all data and unsubscribe.

### Changed

- Internal refactoring of store cleanup logic for better control and reliability.

## [0.1.2] - 2025-06-26

### Fixed

- Bugs in `"edit"` mode are resolved.
- Validation and form prefill now correctly work in edit mode.

### Added

- Edit mode officially supported and tested.

## [0.1.1] - 2025-06-20

### Added

- Initial `README.md` with setup and usage instructions.

## [0.1.0] - 2025-06-19

### Added

- Initial version of form store.
- Core functionality: `formValues`, `setFormValues`, `errors`, `isValid`, and `subscribe()`.
- Support for custom validation schema and "edit"/"add" mode.

### Note

- Experimental release for internal testing.
