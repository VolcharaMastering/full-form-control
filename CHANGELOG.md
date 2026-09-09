# Changelog

All notable changes to this project will be documented in this file.

## [0.4.1] - 2026-09-09

### Added

- **Tests:** Full test suite (6 suites, 58 tests) covering `FormStore` contract, all validation adapters (Joi, Zod, Yup, custom, per-field), `useForm`/`useFormStore` with real React components, and `destroy()`/StrictMode interactions. Tests run against ESM via `ts-jest` and never ship in the published package.
- **Tests:** Regression coverage for Yup schema exceptions and `IFormStore<T>` implementations.
- **API:** Exported `FormStoreState<T>` from package root for direct typing.
- **Docs:** `DESIGN_NOTES.md` explaining non-obvious decisions (edit baseline tracking, StrictMode interactions, method binding patterns).
- **Validation:** `ValidationType` union type exported for validation config type checking.

### Fixed

- **Types:** `ValidationConfig.type` is now a closed union (`"joi" | "zod" | "yup" | "custom" | "field"`). Unreleased tags commented out. Unknown tags throw at runtime instead of silently disabling validation.
- **Packaging:** Added `"type": "module"` and `.js` extensions for Node ESM compatibility. Removed `main` field. Added `src/` to `files` so source maps resolve. Source maps now include declarationMap support.
- **Edit mode:** Fixed baseline capture logic. Edit baseline no longer missed when `initialValues` were non-empty, and `"add"` mode input is no longer dropped when `"edit"` is used first.
- **Initial state:** `isValid` now always starts `false`. Previously reported `true` when created with non-empty `initialValues` before any `setFormValues` call.
- **Field validation:** `applyField` (used for `type: "field"`) now assigns fresh errors object instead of mutating in place, fixing memoization issues.
- **Joi integration:** Now calls `schema.validate(..., { abortEarly: false })` to report all invalid fields, not just the first.
- **Subscriptions:** `FormStore.subscribe` and `FormStore.getSnapshot` are now stable arrow properties, fixing unnecessary re-subscriptions on every render.
- **Config reuse:** `setFormValues(partial)` without config now reuses the last validation config, keeping `errors` in sync. `clearFormValues()` also forgets the remembered config.
- **Destroy lifecycle:** `destroy()` now throws on further calls to `setFormValues`/`clearFormValues` instead of silently failing. Safe no-op after destroy. `subscribe()` is also safe no-op after destroy instead of throwing.
- **Schema exceptions:** When validation schema throws, `isValid` now correctly becomes `false` and subscribers are notified. Exception propagates after state update (not silently swallowed).
- **Clear on destroy:** `destroy()` no longer notifies subscribers, avoiding spurious re-renders on unmount.
- **StrictMode safety:** `subscribe()` after `destroy()` is now safe no-op (logs warning), fixing crashes under React 18 StrictMode mount-cleanup-mount cycle.
- **Yup exceptions:** Yup adapter now rethrows non-ValidationError exceptions (schema bugs) instead of silently reporting valid form.
- **Hooks:** `useFormStore` and `useFormStoreState` now accept `IFormStore<T>` interface, not just `FormStore` class.
- **Clear restore:** `clearFormValues()` now restores to original `initialValues`, not empty object. Preserves baseline in edit forms.

### Changed

- **Internal:** Consolidated method binding patterns. All public methods (`subscribe`, `getSnapshot`, `setFormValues`, `clearFormValues`, `destroy`, `getFormValues`, etc.) now use consistent arrow property binding.
- **Internal:** Removed dead code in `computeIsValid`. Deduplicated type re-exports. Refactored `applyYup`/`handleYupError` to single error-handling path.
- **Formatting:** Consistent 4-space indentation across `src/` via Prettier.
- **Repo:** Fixed `.gitignore` typo. Removed `dist/` from git tracking (still published). Removed build artifacts.
- **Docs:** Rewrote README for clarity: examples first, advanced topics collapsible. Added "Important Warnings" section for critical gotchas (interface vs type, schema exceptions, form-level errors). Documented `useFormStoreState` in public API. Clarified edit mode stickiness, read-only fields, per-field validator caveats, module-level store is client-only.
- **Docs:** Added "Disposing a store" section with StrictMode pitfalls and safe cleanup patterns.

### Deprecated

- `unsubscribeFromStore()` — Use `destroy()` instead. Targeted for removal in v1.0.0.

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
