# full-form-control [![npm version](https://img.shields.io/npm/v/full-form-control)](https://www.npmjs.com/package/full-form-control) [![Downloads](https://img.shields.io/npm/dt/full-form-control)](https://www.npmjs.com/package/full-form-control) [![License: MIT](https://img.shields.io/github/license/VolcharaMastering/full-form-control)](https://github.com/VolcharaMastering/full-form-control/blob/main/LICENSE)

`full-form-control` is a lightweight, headless form state manager for React and Next.js. You create one small store per form, bind inputs to it, and get `formValues`, `errors` and a single `isValid` flag out of the box. Validation is pluggable: Joi, Zod, Yup, a custom validator, or a map of per-field validators. ~~Valibot~~ (not released yet), ~~Superstruct~~ (not released yet), ~~Typia~~ (not released yet), ~~Ajv~~ (not released yet), ~~Vest~~ (not released yet).

Written in TypeScript. Works on React 18+. Supports SSR and React Server Components.

You can use **plain JavaScript** without TypeScript: install the package, use ESM `import`, and write React or Next.js components as `.js` / `.jsx`. Runtime code is published as JavaScript (`dist/*.js`); `.d.ts` types are optional and only help editors and TypeScript consumers.

## Modes: "add" and "edit"

The third argument of `setFormValues` is `"add" | "edit"` and defaults to `"add"`.

- `"add"`: merges `partial` into the current values. Use for new records and normal typing.
- `"edit"`: merges the same way; on the first `"edit"` call for a store (until `clearFormValues()` resets it), the merged values also become **`defaultData`** (baseline for edits). This baseline capture happens once, no matter what was in `formValues` or `defaultData` before, so any earlier `initialValues` or `"add"`-mode input is kept, not overwritten. Use when pre-filling a form from an existing record and you want `getDefaultData()` to match the original.

In `"edit"` mode, `isValid` stays `false` until at least one field value changes compared to `defaultData`, so unchanged data does not count as ready to submit.

Once a store has seen one `"edit"` call, it keeps comparing `formValues` against `defaultData` for `isValid`, even on later calls made with `"add"` (or with no third argument at all). The `"add"` / `"edit"` argument controls whether _this call_ can capture the baseline, not whether `isValid` uses edit-style comparison, that stays on for the store's whole lifetime until `clearFormValues()`. Call `clearFormValues()` first if you want to switch a store back to plain `"add"` semantics.

```ts
setFormValues(existingUser, undefined, "edit");
```

Development note: until v1.0.0 this package is still evolving. SSR and multi-form flows were tested initially but are not guaranteed for every edge case; see the changelog. Zod v4 is supported (`issue.path` uses `PropertyKey[]`).

## Features

- Two ways to use the store: `useForm<T>()` for a single standalone form, `createFormStore<T>()` + `useFormStore<T>()` for several forms sharing state across components. No global singleton, no React Context, no provider tree.
- Direct subscription with `useSyncExternalStore`. One subscription per component, one re-render per update.
- Built-in integrations for Joi, Zod, Yup and a custom schema, plus a per-field validator map. ~~Valibot~~ (not released yet), ~~Superstruct~~ (not released yet), ~~Typia~~ (not released yet), ~~Ajv~~ (not released yet), ~~Vest~~ (not released yet).
- SSR- and RSC-safe: stable `getServerSnapshot` prevents hydration warnings.
- Fully typed public API: `FormStore<T>`, `createFormStore<T>`, `useForm<T>`, `useFormStore<T>`, `useFormStoreState<T>`, `FormSnapshot<T>`, `FormStoreState<T>`, `IFormStore<T>`, `ValidationConfig<T>`, `ValidationType`, plus the helpers `joi`, `zod`, `yup`, `custom`, `field`.
- No runtime dependencies beyond React as a peer.

## Installation

```bash
npm install full-form-control
# or
yarn add full-form-control
```

React 18 or newer is required.

## Quick start

### A single standalone form

Use `useForm` when a page has just one form. It creates and owns its own store internally, so there is no separate store to create or pass around.

```tsx
// components/SignupForm.tsx
import { useForm } from "full-form-control";

type SignupForm = { username: string; email: string };

export const SignupForm = () => {
    const { formValues, errors, isValid, setFormValues } = useForm<SignupForm>({
        username: "",
        email: "",
    });

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

`setFormValues`, `clearFormValues`, `destroy`, `errors` and `isValid` all come from the same hook call. Validation, `"add"`/`"edit"` modes and every other option below work the same way as with `useFormStore`.

### Multiple forms on one page

Use `createFormStore` + `useFormStore` when several components need to read or write the **same** form, or when a page holds more than one independent form. Create one store per form, then pass it to `useFormStore` in every component that reads or writes it.

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

The module-level `signupStore` above is for client-side forms, where each browser tab loads its own copy of the module. Doing the same on the server (a Server Component, an API route, `getServerSideProps`) would share one store across every request and every user; see "Next.js and SSR" below.

### Alternative: store owned by a parent component

When you need isolated instances that still must be shared with a few children (for example a list of repeated sub-forms), create the store in the parent via `useRef` and pass it down, instead of calling `useForm` in each child:

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

This store does not need an unmount effect either; see "Disposing a store" under the API section below before adding one.

## API

### `useForm<T>(initialValues?)`

React hook for a single standalone form. Creates a `FormStore<T>` internally on first render (via `useRef`) and subscribes to it, so there is no separate `createFormStore` call. `initialValues` only applies the first time the store is created. Returns the same shape as `useFormStore` below.

### `createFormStore<T>(initialValues?)`

Creates a new `FormStore<T>`. Call once per form, at module level or inside a parent with `useRef`, then share the instance across every component that needs to read or write that form via `useFormStore`.

### `useFormStore<T>(store)`

React hook. Subscribes to a `FormStore<T>` with a single `useSyncExternalStore` call and returns the current snapshot plus action methods.

### `useFormStoreState<T>(store)`

The hook `useForm` and `useFormStore` both call internally: `useFormStore(store)` is a one-line wrapper around `useFormStoreState(store)`. Exported directly for the rare case of writing your own wrapper hook (for example, one that also reads from another store or a Context) without duplicating the `useSyncExternalStore` setup. Accepts anything implementing `IFormStore<T>`, not just instances returned by `createFormStore`.

Return shape (identical for `useForm`, `useFormStore` and `useFormStoreState`):

| Property / Method      | Type                                                                                     | Description                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formValues`           | `T`                                                                                      | Current form values, keyed by field name.                                                                                                                                                                                                                                                                                                                                                                                        |
| `errors`               | `Record<string, string>`                                                                 | Field path to error message. Empty whenever validation reported no problems, which is not the same as `isValid` being `true`: in `"edit"` mode with no changes yet, `errors` is empty but `isValid` is still `false` (see Modes above).                                                                                                                                                                                          |
| `isValid`              | `boolean`                                                                                | `false` until the first `setFormValues` call, even with non-empty initial values. After that, in `"add"` mode: `true` when `errors` is empty and `formValues` has at least one key. In `"edit"` mode: also requires a change versus `defaultData` (see Modes above).                                                                                                                                                             |
| `setFormValues`        | `(partial: Partial<T>, config?: ValidationConfig<T>, process?: "add" \| "edit") => void` | Merges `partial` into the store, then validates with `config` if given, or with the last `config` used on this store if you omit it. Notifies subscribers either way. Throws after `destroy()`.                                                                                                                                                                                                                                  |
| `clearFormValues`      | `() => void`                                                                             | Restores `formValues` and `defaultData` to the `initialValues` the store was created with (an empty object if none were given), and resets errors, the remembered validation config and the `"add"`/`"edit"` mode (see Modes above). Keeps subscribers. Throws after `destroy()`.                                                                                                                                                |
| `destroy`              | `() => void`                                                                             | Clears data and removes every subscriber, then rejects further `setFormValues`/`clearFormValues` calls on this store. A one-way operation, not a "reset the form" action while the component keeps using it — use `clearFormValues` for that. Calling it more than once is harmless. Returned by both hooks for a uniform shape, but **for `useForm` there is normally nothing to call it for** — see "Disposing a store" below. |
| `unsubscribeFromStore` | `() => void`                                                                             | Deprecated alias of `destroy`. Same "normally not needed for `useForm`" note applies.                                                                                                                                                                                                                                                                                                                                            |

### `FormStore<T>` (low-level class)

You rarely need to touch it directly, but it is public so you can read or write the form outside React (API handlers, utilities, tests):

It also exposes `formValues`, `defaultData`, `errors` and `isValid` as public properties, mainly so the getter methods below have something to read. Treat them as read-only: assigning to them directly (`store.formValues = {...}`) does not call `notify()`, so `getSnapshot()` and any subscribed React component keep showing the old value. Always go through `setFormValues` / `clearFormValues` to change form state.

- `getFormValues(): T`
- `getDefaultData(): T`
- `getErrors(): Record<string, string>`
- `isFormValid(): boolean`
- `getSnapshot(): FormSnapshot<T>`
- `setFormValues(partial, config?, process?)` — throws after `destroy()`
- `clearFormValues()` — throws after `destroy()`
- `destroy()` (deprecated alias: `unsubscribeFromStore()`) — safe to call more than once
- `subscribe(callback): () => void` — safe no-op after `destroy()` (logs a warning), so React re-subscribing to an already-destroyed store (for example under StrictMode, see "Disposing a store" below) does not crash the render
- `getSubscribersCount(): number`

### Disposing a store

`destroy()` is one-way: once called, `setFormValues` and `clearFormValues` throw on this store for good. That makes it easy to get wrong with `useEffect(() => () => store.destroy(), [])`, the pattern you would normally reach for to "clean up on unmount".

- **`useForm`'s own store never needs disposing.** It is created inside that one component and nothing outside the component can reach it. When the component unmounts, `useSyncExternalStore`'s subscription unsubscribes itself, and the store is garbage collected once nothing references it anymore. Do not call the `destroy` this hook returns; there is nothing to clean up.
- **Do not pair `destroy()` with a bare mount/unmount effect in a component that also reads or writes that same store** (the `createFormStore` + `useRef` pattern from "Alternative: store owned by a parent component"). In development, React 18 StrictMode runs that cleanup once immediately after the initial mount, as part of its "mount, cleanup, mount again" effect check, before you ever interact with the form. `destroy()` cannot be undone, so that phantom cleanup permanently destroys the store while the component is still mounted and rendered; the component keeps using the `setFormValues` it already got back from `useFormStore`, and the next call throws. This is development-only (production does not double-invoke effects), but it makes the form look completely broken the moment you add that effect locally.
- **If a store genuinely needs disposing**, call `destroy()` from code that is not the mount/unmount cycle of a component still using that store: an explicit "close and discard this form" action, a parent permanently removing a list item that owned a per-item store, or a route-level cleanup that does not just remount the same component. For "reset this form when it becomes irrelevant while the component stays mounted", use `clearFormValues()` instead: it is safe to call from an effect, and it never leaves the store unusable for later calls.

### Types

```ts
type FormSnapshot<T> = {
    formValues: T;
    errors: Record<string, string>;
    isValid: boolean;
};

// Return type of useForm<T> and useFormStore<T>: the snapshot above plus the action methods.
type FormStoreState<T> = FormSnapshot<T> & {
    setFormValues: FormStore<T>["setFormValues"];
    clearFormValues: () => void;
    destroy: () => void;
    unsubscribeFromStore: () => void;
};

type FieldValidator<Value> = (value: Value) => string | null;

type ValidationType = "joi" | "zod" | "yup" | "custom" | "field";

type ValidationConfig<T> =
    | {
          type: "joi";
          schema: {
              validate(
                  data: T,
                  options?: { abortEarly?: boolean }
              ): {
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
                        error: { issues: { path: PropertyKey[]; message: string }[] };
                    };
          };
      }
    | { type: "yup"; schema: { validateSync(data: T, options?: { abortEarly?: boolean }): void } }
    | { type: "custom"; schema: { validate(data: T): Record<string, { message: string }> } }
    | { type: "field"; schema: Partial<{ [K in keyof T]: FieldValidator<T[K]> }> };
// Not released yet. Uncomment when the adapter is ready:
// | { type: "valibot" | "superstruct" | "typia" | "ajv" | "vest"; schema: { validate(data: T): Record<string, { message: string }> } };
```

All of these are exported from the package root.

## Validation

Pass a `ValidationConfig<T>` as the second argument to `setFormValues`. `type` must be one of `"joi" | "zod" | "yup" | "custom" | "field"` (`ValidationType`). TypeScript and the editor flag any other tag as an error.

In JavaScript, put `// @ts-check` at the top of the file (or use a `jsconfig.json` with `checkJs`) so the same types apply. You can pass `{ type: "zod", schema }` or a helper: `joi(schema)`, `zod(schema)`, `yup(schema)`, `custom(schema)`, `field(schema)`. A typo such as `{ type: "zodd" }` or a missing helper name is then an editor error, the same as in TypeScript.

```js
// @ts-check
import { createFormStore, zod } from "full-form-control";

const store = createFormStore({ email: "" });
store.setFormValues({ email: "foo" }, zod(schema));
```

For `"joi"`, `"zod"`, `"yup"` and `"custom"`, the whole `formValues` object is re-validated on every call, and `errors` is fully replaced with the result. Only `"field"` validates a subset: just the keys present in this call's `partial` argument are re-checked, and errors for other fields are left untouched (see "Per-field validators" below).

The store remembers the last `config` it received and keeps using it on later `setFormValues` calls that omit the argument, so `errors` stays in sync with `formValues` even if you only pass `config` on some calls (for example, validating on blur but not on every keystroke). To stop validating, call `clearFormValues()`, or pass a `config` whose schema always reports no errors.

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

The store calls `schema.validate(formValues, { abortEarly: false })`, so `errors` collects every invalid field, not just the first one, the same as the Yup and Zod integrations below.

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

Only fields present in the first argument are re-validated on this call. This means `isValid` only reflects the fields that have actually been checked so far: a required field that was never touched has no error for it yet, so it does not block `isValid` from becoming `true`. With `type: "field"`, do not treat `isValid` as "the whole form passed" until every field has received at least one call; validate the full object once (a "custom" schema, or one call per field) before treating `isValid` as a submit gate.

### Custom

Provide a schema object with a `validate(data)` method that returns `Record<string, { message: string }>`:

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

~~Valibot~~, ~~Superstruct~~, ~~Typia~~, ~~Ajv~~ and ~~Vest~~ are not released yet. Their `type` tags are commented out until the adapters ship.

## Next.js and SSR

`useForm` and `useFormStore` both pass a stable `getServerSnapshot` to `useSyncExternalStore`, so SSR and React Server Components work without hydration warnings.

That stability guarantee is about reference equality, not correctness: it prevents React from tearing or warning about a snapshot changing mid-render because the same cached object is returned every time it is asked for during one render. It does not guarantee the _value_ inside that snapshot is the right one for the current request; that still depends on not sharing a stateful store across requests, which is exactly what the module-level-store rule below is for.

- `useForm` keeps its store in a `useRef`, so it never leaks state between requests or users on the server.
- If you use `createFormStore` directly, only create it at module level in code that runs on the client, like the "Multiple forms on one page" example above; a browser tab loads its own copy of the module, so there is nothing to share between users. Never create a store at module level in code that runs on the server (a Server Component, an API route, `getServerSideProps`), since that instance is shared across every request and every user. Inside a client component, prefer `useRef` instead, the same way "Alternative: store owned by a parent component" does.
- Components that call `useForm` or `useFormStore` must be client components (`"use client"`); each module under `src/react/` already starts with `"use client"` itself, but the directive only marks a boundary at the file that renders your component, so your own component file still needs it too.
- The `createFormStore` factory itself has no React-only code and can be imported into server-only code (a Server Component, an API route) without pulling `useSyncExternalStore` into that module graph, since only the hook modules carry the `"use client"` boundary. Creating a stateful store inside a Server Component is still pointless, since the state cannot cross the server/client boundary.

## Why no React Context

Subscriptions already happen at the store level via `useSyncExternalStore`. Context would add provider and consumer cost and trigger extra re-renders on reference changes. A direct store reference (module import or `useRef`) is faster, simpler and works the same in every component.

## Playground

Try it on Playcode: [testForm for full-form-control](https://playcode.io/2442479)

## Changelog and links

See [CHANGELOG.md](CHANGELOG.md) for release notes.
GitHub: [VolcharaMastering/full-form-control](https://github.com/VolcharaMastering/full-form-control)

## TODO

- Built-in HTML validation support.
