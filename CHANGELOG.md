# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed

-   **Behavior:** in "edit" mode (`setFormValues(..., ..., "edit")`) `isValid` stays `false` until at least one field value changes compared to `defaultData`.
-   **Types:** updated the Zod shape for v4. `issue.path` is now treated as `PropertyKey[]` (can include `symbol`).

## [0.3.0] - 2026-04-24

### Added

-   New `destroy()` method on `FormStore` with clear dispose semantics: clears form data and removes all subscribers. Also exposed from the `useFormStore` hook.
-   Exported the full public type set from the package: `FormSnapshot<T>`, `IFormStore<T>`, `ValidationConfig<T>`, `FieldValidator<Value>`, `FieldValidationSchema<T>`, and `GenericValidationResult`.

### Changed

-   **Behavior:** initial `isValid` is now `true` only when the form has at least one key AND there are no errors. Previously a form initialised with an empty object `{}` was reported as valid before any validation ran, which could enable submit buttons by mistake.
-   **Internal:** refactored `FormStore.setFormValues` to dispatch through a small `runValidation` + per-library private methods (`applyJoi`, `applyZod`, `applyYup`, `applyGeneric`, `applyField`) instead of a large inline `switch`. No change to the public API.
-   **Types:** moved all public types from the ambient `src/core/types.d.ts` into a real module `src/core/types.ts` with `export`. Merged the two previous `IFormStore<T>` declarations and the duplicated `FieldValidator` / `ValidationSchema` into a single coherent set. Dropped the undefined `ObjectSchema<T>` branch and the unused `ValidationSchemaInterface`. Added narrow result types (`JoiValidationResult`, `ZodValidationResult`, `YupValidationError`, `GenericValidationResult`) and wired them through the validation handlers.
-   **Types:** `FormStore` and the hook now use `T extends Record<string, unknown>` instead of `Record<string, any>`. Removed the file-wide `eslint-disable @typescript-eslint/no-explicit-any`.

### Deprecated

-   `FormStore.unsubscribeFromStore()` is kept as an alias of `destroy()` and marked `@deprecated`. The same alias is available on the `useFormStore` return object. It will be removed in a future major version.

## [0.2.1] - 2026-04-24

### Changed

-   Collapsed three `useSyncExternalStore` calls in `useFormStore` into one. The store now caches a single snapshot object `{ formValues, errors, isValid }` and rebuilds it inside `notify()`, so every state change triggers at most one re-render per subscribed component instead of up to three.

### Added

-   Exported `FormSnapshot<T>` type from `src/core/store.ts` for consumers who want to type the snapshot directly.
-   `FormStore.getSnapshot()` returns the cached snapshot. Stable reference between notifies, fresh reference after every `setFormValues` or `clearFormValues`.

## [0.2.0] - 2026-04-24

### Added

-   `createFormStore<T>(initialValues?)` factory in `src/core/store.ts`. Creates a new `FormStore` per form without any React Context.
-   `getServerSnapshot` argument in every `useSyncExternalStore` call inside `useFormStore`. The hook is now safe for SSR and React Server Components in Next.js and no longer risks hydration warnings.

### Changed

-   **Breaking:** `useFormStore` now takes a `FormStore<T>` instance as an argument. It no longer creates or holds a hidden global store, so multiple forms on one page are fully isolated. Migration: create the store once with `createFormStore` and pass it to the hook in every component that reads or writes that form.

### Removed

-   Module-level global `FormStore` instance from `src/react/useCustomValidation.ts`. Every form must now own its own store.

### Note

-   Detailed description of the new API and usage patterns lives in `src/docks/made.md`.

## [0.1.6] - 2025-07-08

### Fixed

-   Fixed versioning bug.

### Changed

-   Fixed versioning bug.

## [0.1.5] - 2025-06-28

### Fixed

-   Improved dependency error handling.
-   React added to peerDependencies.

### Changed

-   Removed React from dependencies and added it to peerDependencies.

## [0.1.4] - 2025-06-28

### Fixed

-   Improved compatibility with Zod and Yup validation schemas.
-   Enhanced functionality to support custom validation schemas.

### Changed

-   Refactored the validation logic in the store. Removed the universal approach and implemented distinct logic for each type of validation library.

## [0.1.3] - 2025-06-27

### Fixed

-   `clearFormValues()` now correctly resets only the form data, not the subscriptions.
-   Separated the logic of `clearFormValues` and unsubscribe behavior.
-   Introduced a new method `unsubscribeFromStore()` to explicitly clear all data and unsubscribe.

### Changed

-   Internal refactoring of store cleanup logic for better control and reliability.

## [0.1.2] - 2025-06-26

### Fixed

-   Bugs in `"edit"` mode are resolved.
-   Validation and form prefill now correctly work in edit mode.

### Added

-   Edit mode officially supported and tested.

## [0.1.1] - 2025-06-20

### Added

-   Initial `README.md` with setup and usage instructions.

## [0.1.0] - 2025-06-19

### Added

-   Initial version of form store.
-   Core functionality: `formValues`, `setFormValues`, `errors`, `isValid`, and `subscribe()`.
-   Support for custom validation schema and "edit"/"add" mode.

### Note

-   Experimental release for internal testing.
