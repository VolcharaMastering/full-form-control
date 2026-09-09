# full-form-control [![npm version](https://img.shields.io/npm/v/full-form-control)](https://www.npmjs.com/package/full-form-control) [![Downloads](https://img.shields.io/npm/dt/full-form-control)](https://www.npmjs.com/package/full-form-control) [![License: MIT](https://img.shields.io/github/license/VolcharaMastering/full-form-control)](https://github.com/VolcharaMastering/full-form-control/blob/main/LICENSE)

`full-form-control` is a lightweight, headless form state manager for React and Next.js. You create one small store per form, bind inputs to it, and get `formValues`, `errors` and a single `isValid` flag out of the box. Validation is pluggable: Joi, Zod, Yup, a custom validator, or a map of per-field validators.

Written in TypeScript. Works on React 18+. You can use **plain JavaScript** without TypeScript.

---

## Installation

```bash
npm install full-form-control
# or
yarn add full-form-control
```

React 18 or newer is required.

---

## Quick Start

### A single form

Use `useForm` when a page has just one form:

```tsx
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
        <form onSubmit={(e) => { e.preventDefault(); /* submit */ }}>
            <input name="username" value={formValues.username ?? ""} onChange={handleChange} />
            {errors.username && <span>{errors.username}</span>}
            <input name="email" value={formValues.email ?? ""} onChange={handleChange} />
            {errors.email && <span>{errors.email}</span>}
            <button type="submit" disabled={!isValid}>Sign up</button>
        </form>
    );
};
```

### Multiple forms or shared state

Use `createFormStore` + `useFormStore` when several components need the same form:

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
    // ... same as above
};
```

---

## Features

- **Two usage styles:** `useForm()` for a single form, or `createFormStore()` + `useFormStore()` for multiple forms
- **Direct subscription with `useSyncExternalStore`:** One subscription per component, one re-render per change
- **Pluggable validation:** Joi, Zod, Yup, custom schema, or per-field validators
- **No dependencies:** Only React 18+ as a peer
- **Fully typed API:** TypeScript support throughout

<details>
<summary><strong>Show more features →</strong></summary>

- No global singleton, no React Context, no provider tree
- Built-in integrations for Joi, Zod, Yup, and custom validators
- Per-field validation with `type: "field"`
- SSR-safe with stable `getServerSnapshot` (tests in progress, not guaranteed for all edge cases)
- Arrow function properties for `getSnapshot` and all actions (safe to destructure)

</details>

---

## Validation

Pass a validation schema as the second argument to `setFormValues`:

**Zod:**
```ts
import { z } from "zod";

const schema = z.object({
    username: z.string().min(3),
    email: z.string().email(),
});

setFormValues({ username: "ab" }, { type: "zod", schema });
```

**Joi:**
```ts
import Joi from "joi";

const schema = Joi.object({
    username: Joi.string().min(3),
    email: Joi.string().email().required(),
});

setFormValues({ username: "ab" }, { type: "joi", schema });
```

**Yup:**
```ts
import * as Yup from "yup";

const schema = Yup.object({
    username: Yup.string().min(3),
    email: Yup.string().email(),
});

setFormValues({ username: "ab" }, { type: "yup", schema });
```

**Per-field validators:**
```ts
setFormValues(
    { email: "foo" },
    {
        type: "field",
        schema: {
            email: (v) => (/.+@.+/.test(v) ? null : "Invalid email"),
        },
    }
);
```

**Custom schema:**
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

<details>
<summary><strong>Validation details →</strong></summary>

- The store remembers the last validation config and reuses it on later `setFormValues()` calls that omit the argument
- Only `type: "field"` validates a subset of fields; other types re-validate the entire form
- To stop validating without clearing data, you can pass `clearFormValues()` or switch to a permissive schema
- Use helpers: `zod(schema)`, `joi(schema)`, `yup(schema)`, `custom(schema)`, `field(schema)` for better editor support in JavaScript

</details>

---

## Modes: "add" and "edit"

<details>
<summary><strong>Expand to learn about add/edit modes →</strong></summary>

The third argument of `setFormValues` is `"add" | "edit"` and defaults to `"add"`.

**`"add"` mode (default):**
- Merges new values into current form state
- `isValid` becomes `true` when there are no errors and at least one field has a value

**`"edit"` mode:**
- On the first `"edit"` call, the current values become the baseline for comparison (`defaultData`)
- `isValid` stays `false` until at least one field value differs from the baseline
- Use when loading an existing record: load the data, call `setFormValues(record, undefined, "edit")`, and the form will only be valid once the user changes something
- Once edit mode is activated, all later calls (even with `"add"` or no mode argument) keep comparing against the baseline until `clearFormValues()` resets the store

**Example:**
```ts
// Loading an existing user for editing
const user = await fetchUser(id);
setFormValues(user, undefined, "edit");
// Form is now "locked" until user changes something
```

</details>

---

## Next.js and SSR

The package is SSR-safe but **not guaranteed for all edge cases** — tests are in progress.

- `useForm` stores its state in a `useRef`, so it never leaks state between requests
- `createFormStore` at module level works for client-side code; never create it at module level in Server Components or API routes
- Components calling `useForm` or `useFormStore` must be client components (`"use client"`)
- See [SSR details](./DESIGN_NOTES.md) for more information

---

## API Reference

### `useForm<T>(initialValues?)`
Returns `{ formValues, errors, isValid, setFormValues, clearFormValues, destroy }`.

### `createFormStore<T>(initialValues?)`
Creates a store. Pass it to `useFormStore` in any component that reads or writes it.

### `useFormStore<T>(store)`
Subscribes to a store and returns the current state plus action methods.

| Method / Field | Type | Description |
|---|---|---|
| `formValues` | `T` | Current form state |
| `errors` | `Record<string, string>` | Field path → error message |
| `isValid` | `boolean` | `false` initially, then `true` when valid |
| `setFormValues(partial, config?, mode?)` | Method | Merge values and validate |
| `clearFormValues()` | Method | Reset to initial state |
| `destroy()` | Method | Clean up store (usually not needed for `useForm`) |

<details>
<summary><strong>Full API details →</strong></summary>

### Detailed API Reference

#### `useForm<T>(initialValues?)`
React hook for a single standalone form. Creates a `FormStore<T>` internally on first render (via `useRef`) and subscribes to it. `initialValues` only applies the first time the store is created. Returns the same shape as `useFormStore` below.

#### `createFormStore<T>(initialValues?)`
Creates a new `FormStore<T>`. Call once per form, at module level or inside a parent with `useRef`, then share the instance across every component that needs to read or write that form via `useFormStore`.

#### `useFormStore<T>(store)`
React hook. Subscribes to a `FormStore<T>` with a single `useSyncExternalStore` call and returns the current snapshot plus action methods.

#### `useFormStoreState<T>(store)`
The hook `useForm` and `useFormStore` both call internally. Exported directly for writing your own wrapper hook without duplicating the `useSyncExternalStore` setup. Accepts anything implementing `IFormStore<T>`.

#### `FormStore<T>` (low-level class)
Public so you can read or write the form outside React (API handlers, utilities, tests). Exposes `formValues`, `defaultData`, `errors` and `isValid` as **read-only** public properties. Always go through `setFormValues` / `clearFormValues` to change state.

**Public methods:**
- `getFormValues(): T`
- `getDefaultData(): T`
- `getErrors(): Record<string, string>`
- `isFormValid(): boolean`
- `getSnapshot(): FormSnapshot<T>`
- `setFormValues(partial, config?, process?)` — throws after `destroy()`
- `clearFormValues()` — throws after `destroy()`
- `destroy()` — safe to call more than once
- `subscribe(callback): () => void` — safe no-op after `destroy()`
- `getSubscribersCount(): number`

#### Disposing a store

`destroy()` is one-way: once called, `setFormValues` and `clearFormValues` throw. This makes it easy to get wrong with `useEffect(() => () => store.destroy(), [])`.

- **`useForm`'s own store never needs disposing.** It is created inside that one component and nothing outside can reach it. When the component unmounts, the store is garbage collected. Do not call the `destroy` this hook returns.
- **Do not pair `destroy()` with a mount/unmount effect in a component that also uses that store** (`createFormStore` + `useRef` pattern). In development, React 18 StrictMode runs the cleanup immediately after mount, permanently destroying the store while the component is still rendering; the next `setFormValues` call throws.
- **If a store genuinely needs disposing**, call `destroy()` from code outside the mount/unmount cycle: an explicit "close and discard this form" action, a parent permanently removing a list item that owned a store, or a route-level cleanup. For "reset this form when it becomes irrelevant while the component stays mounted", use `clearFormValues()` instead: it is safe to call from an effect and never leaves the store unusable.

#### Type Definitions

```ts
type FormSnapshot<T> = {
    formValues: T;
    errors: Record<string, string>;
    isValid: boolean;
};

type FormStoreState<T> = FormSnapshot<T> & {
    setFormValues: FormStore<T>["setFormValues"];
    clearFormValues: () => void;
    destroy: () => void;
    unsubscribeFromStore: () => void; // deprecated
};

type FieldValidator<Value> = (value: Value) => string | null;

type ValidationType = "joi" | "zod" | "yup" | "custom" | "field";

type ValidationConfig<T> = 
    | { type: "joi"; schema: JoiSchema<T> }
    | { type: "zod"; schema: ZodSchema<T> }
    | { type: "yup"; schema: YupSchema<T> }
    | { type: "custom"; schema: CustomSchema<T> }
    | { type: "field"; schema: Partial<{ [K in keyof T]: FieldValidator<T[K]> }> };
```

All types are exported from the package root.

</details>

---

## ⚠️ Important Warnings

### 1. Use `type`, not `interface` (TypeScript)

Form types **must be declared with `type`, not `interface`**:

```ts
// ✅ GOOD
type SignupForm = { username: string; email: string };

// ❌ BAD - causes TypeScript error
interface SignupForm { username: string; email: string }
```

This is a TypeScript limitation: interfaces have no implicit index signature. If you get an error like `Type 'X' does not satisfy the constraint 'Record<string, unknown>'`, use a `type` alias instead.

### 2. Exceptions in validation schemas can leave `isValid: true`

If your validation schema throws an unexpected error, the form may appear valid despite the crash:

```ts
// ❌ DANGEROUS - if schema.validate() throws, isValid becomes true
const schema = {
    validate(data) {
        throw new Error("oops!");  // Form shows isValid: true!
    }
};
setFormValues({ email: "test" }, { type: "custom", schema });
```

**Solution:** Wrap schema logic in try-catch or ensure your schema never throws uncaught errors.

### 3. Form-level validation errors are not displayed

Errors that apply to the entire form (not a single field) cannot be displayed using the standard `errors.fieldName` pattern:

```ts
// ❌ These errors land under an empty key "" and are hard to access
const schema = {
    validate(data) {
        if (data.password !== data.passwordConfirm) {
            return { "": { message: "Passwords don't match" } };
        }
        return {};
    }
};
```

**Workaround:** Map form-level errors to a dummy field:

```ts
return { _form: { message: "Passwords don't match" } };
// Access in JSX: {errors._form && <span>{errors._form}</span>}
```

---

## License

MIT

---

## Resources

- [GitHub](https://github.com/VolcharaMastering/full-form-control)
- [Changelog](CHANGELOG.md)
- Playground - soon
