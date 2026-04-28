# full-form-control [![npm version](https://img.shields.io/npm/v/full-form-control)](https://www.npmjs.com/package/full-form-control) [![Downloads](https://img.shields.io/npm/dt/full-form-control)](https://www.npmjs.com/package/full-form-control) [![License: MIT](https://img.shields.io/github/license/VolcharaMastering/full-form-control)](https://github.com/VolcharaMastering/full-form-control/blob/main/LICENSE)

`full-form-control` is a lightweight, headless form state manager for React and Next.js. You create one small store per form, bind inputs to it, and get `formValues`, `errors` and a single `isValid` flag out of the box. Validation is pluggable: Joi, Zod, Yup, ~~Valibot~~ (not released yet), ~~Superstruct~~ (not released yet), ~~Typia~~ (not released yet), ~~Ajv~~ (not released yet), ~~Vest~~ (not released yet), a custom validator, or a map of per-field validators.

Written in TypeScript. Works on React 18+. Supports SSR and React Server Components.

You can use **plain JavaScript** without TypeScript: install the package, use ESM `import`, and write React or Next.js components as `.js` / `.jsx`. Runtime code is published as JavaScript (`dist/*.js`); `.d.ts` types are optional and only help editors and TypeScript consumers.

## Modes: "add" and "edit"

The third argument of `setFormValues` is `"add" | "edit"` and defaults to `"add"`.

- `"add"`: merges `partial` into the current values. Use for new records and normal typing.
- `"edit"`: merges the same way; on the first `"edit"` call when the store has no data (or `defaultData` is empty), the payload becomes both current values and **`defaultData`** (baseline for edits). Use when pre-filling a form from an existing record and you want `getDefaultData()` to match the original.

In `"edit"` mode, `isValid` stays `false` until at least one field value changes compared to `defaultData`, so unchanged data does not count as ready to submit.

```ts
setFormValues(existingUser, undefined, "edit");
```

Development note: until v1.0.0 this package is still evolving. SSR and multi-form flows were tested initially but are not guaranteed for every edge case; see the changelog. Zod v4 is supported (`issue.path` uses `PropertyKey[]`).

## Features

- Per-form store via `createFormStore<T>()`. No global singleton, no React Context, no provider tree.
- Direct subscription with `useSyncExternalStore`. One subscription per component, one re-render per update.
- Built-in integrations for Joi, Zod, Yup plus a generic adapter for ~~Valibot~~ (not released yet), ~~Superstruct~~ (not released yet), ~~Typia~~ (not released yet), ~~Ajv~~ (not released yet), ~~Vest~~ (not released yet) and custom schemas, plus a per-field validator map.
- SSR- and RSC-safe: stable `getServerSnapshot` prevents hydration warnings.
- Fully typed public API: `FormStore<T>`, `createFormStore<T>`, `useFormStore<T>`, `FormSnapshot<T>`, `IFormStore<T>`, `ValidationConfig<T>`.
- No runtime dependencies beyond React as a peer.

## Installation

```bash
npm install full-form-control
# or
yarn add full-form-control
```

React 18 or newer is required.

## Quick start

Create one store per form, then pass it to `useFormStore` in every component that reads or writes it.

```ts
// forms/signupStore.ts
import { createFormStore } from "full-form-control";

type SignupForm = { username: string; email: string };

export const signupStore = createFormStore<SignupForm>({
    username: "",
    email: "",
});
```

```tsx
// components/SignupForm.tsx
import { useFormStore } from "full-form-control";
import { signupStore } from "../forms/signupStore";

export const SignupForm = () => {
    const { formValues, errors, isValid, setFormValues } = useFormStore(signupStore);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormValues({ [name]: value });
    };

    return (
        <form>
            <input name="username" value={formValues.username ?? ""} onChange={handleChange} />
            <input name="email" value={formValues.email ?? ""} onChange={handleChange} />
            {errors.username && <span>{errors.username}</span>}
            {errors.email && <span>{errors.email}</span>}
            <button type="submit" disabled={!isValid}>
                Sign up
            </button>
        </form>
    );
};
```

Any other component can import `signupStore` and call `useFormStore(signupStore)` to subscribe to the same form.

### Alternative: store owned by a component

When you need isolated instances (for example a list of repeated sub-forms), create the store inside a parent via `useRef`:

```tsx
import { useRef } from "react";
import { createFormStore, useFormStore, FormStore } from "full-form-control";

type LoginForm = { login: string; password: string };

export const Login = () => {
    const storeRef = useRef<FormStore<LoginForm> | null>(null);
    if (!storeRef.current) {
        storeRef.current = createFormStore<LoginForm>({ login: "", password: "" });
    }

    const { formValues, setFormValues, isValid } = useFormStore(storeRef.current);
    // ...
};
```

## API

### `createFormStore<T>(initialValues?)`

Creates a new `FormStore<T>`. Call once per form, at module level or inside a parent with `useRef`.

### `useFormStore<T>(store)`

React hook. Subscribes to a `FormStore<T>` with a single `useSyncExternalStore` call and returns the current snapshot plus action methods.

Return shape:

| Property / Method      | Type                                                                                     | Description                                                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formValues`           | `T`                                                                                      | Current form values, keyed by field name.                                                                                                                              |
| `errors`               | `Record<string, string>`                                                                 | Field path to error message. Empty object when the form is valid.                                                                                                      |
| `isValid`              | `boolean`                                                                                | In `"add"` mode: `true` when `errors` is empty and `formValues` has at least one key. In `"edit"` mode: also requires a change versus `defaultData` (see Modes above). |
| `setFormValues`        | `(partial: Partial<T>, config?: ValidationConfig<T>, process?: "add" \| "edit") => void` | Merges `partial` into the store, runs validation if `config` is provided, and notifies subscribers.                                                                    |
| `clearFormValues`      | `() => void`                                                                             | Resets values, defaults and errors. Keeps subscribers.                                                                                                                 |
| `destroy`              | `() => void`                                                                             | Clears data and removes every subscriber. Use on unmount or route change.                                                                                              |
| `unsubscribeFromStore` | `() => void`                                                                             | Deprecated alias of `destroy`.                                                                                                                                         |

### `FormStore<T>` (low-level class)

You rarely need to touch it directly, but it is public so you can read or write the form outside React (API handlers, utilities, tests):

- `getFormValues(): T`
- `getDefaultData(): T`
- `getErrors(): Record<string, string>`
- `isFormValid(): boolean`
- `getSnapshot(): FormSnapshot<T>`
- `setFormValues(partial, config?, process?)`
- `clearFormValues()`
- `destroy()` (deprecated alias: `unsubscribeFromStore()`)
- `subscribe(callback): () => void`
- `getSubscribersCount(): number`

### Types

```ts
type FormSnapshot<T> = {
    formValues: T;
    errors: Record<string, string>;
    isValid: boolean;
};

type FieldValidator<Value> = (value: Value) => string | null;

type ValidationConfig<T> =
    | {
          type: "joi";
          schema: {
              validate(data: T): {
                  error?: { details?: { path: (string | number)[]; message: string }[] };
              };
          };
      }
    | {
          type: "zod";
          schema: {
              safeParse(data: T):
                  | { success: true }
                  | {
                        success: false;
                        error: { issues: { path: (string | number)[]; message: string }[] };
                    };
          };
      }
    | { type: "yup"; schema: { validateSync(data: T, options?: { abortEarly?: boolean }): void } }
    | {
          type: "valibot" | "superstruct" | "typia" | "ajv" | "vest" | "custom";
          schema: { validate(data: T): Record<string, { message: string }> };
      }
    | { type: "field"; schema: Partial<{ [K in keyof T]: FieldValidator<T[K]> }> };
```

All of these are exported from the package root.

## Validation

Pass a `ValidationConfig<T>` as the second argument to `setFormValues`. The store picks the right handler by the `type` tag, fills the `errors` map and recomputes `isValid`.

### Joi

```ts
import Joi from "joi";

const schema = Joi.object({
    username: Joi.string().alphanum().min(3).required(),
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required(),
});

setFormValues({ username: "ab" }, { type: "joi", schema });
```

### Zod

```ts
import { z } from "zod";

const schema = z.object({
    username: z.string().min(3, "Must be 3+ chars"),
    email: z.string().email(),
});

setFormValues({ email: "foo" }, { type: "zod", schema });
```

### Yup

```ts
import * as Yup from "yup";

const schema = Yup.object({
    username: Yup.string().min(3, "Too short").required(),
    email: Yup.string().email("Invalid email").required(),
});

setFormValues({ username: "john" }, { type: "yup", schema });
```

### Per-field validators

```ts
setFormValues(
    { email: "foo" },
    {
        type: "field",
        schema: {
            email: (v) => (/.+@.+/.test(v) ? null : "Invalid email"),
            username: (v) => (v.length >= 3 ? null : "Too short"),
        },
    }
);
```

Only fields present in the first argument are re-validated on this call.

### Custom / ~~Valibot~~ (not released yet) / ~~Superstruct~~ (not released yet) / ~~Typia~~ (not released yet) / ~~Ajv~~ (not released yet) / ~~Vest~~ (not released yet)

All of these use one shared shape. Provide a schema object with a `validate(data)` method that returns `Record<string, { message: string }>`:

```ts
const customSchema = {
    validate(data) {
        const errors: Record<string, { message: string }> = {};
        if (!data.email?.includes("@")) {
            errors.email = { message: "Invalid email" };
        }
        return errors;
    },
};

setFormValues({ email: "foo" }, { type: "custom", schema: customSchema });
```

The store extracts `.message` from each entry, so `errors` ends up as `Record<string, string>` for the UI.

## Next.js and SSR

`useFormStore` passes a stable `getServerSnapshot` to `useSyncExternalStore`, so SSR and React Server Components work without hydration warnings.

- Create stores with `createFormStore` at module level or inside a `"use client"` component via `useRef`.
- Components that call `useFormStore` must be client components (`"use client"`).
- The factory itself has no React-only code, but creating a stateful store inside a Server Component is pointless since the state cannot cross the server/client boundary.

## Why no React Context

Subscriptions already happen at the store level via `useSyncExternalStore`. Context would add provider and consumer cost and trigger extra re-renders on reference changes. A direct store reference (module import or `useRef`) is faster, simpler and works the same in every component.

## Playground

Try it on Playcode: [testForm for full-form-control](https://playcode.io/2442479)

## Changelog and links

See [CHANGELOG.md](CHANGELOG.md) for release notes.
GitHub: [VolcharaMastering/full-form-control](https://github.com/VolcharaMastering/full-form-control)

## TODO

- Built-in HTML validation support.
- JS (non-TS) usage example.
