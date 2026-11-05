# full-form-control [![npm version](https://img.shields.io/npm/v/full-form-control)](https://www.npmjs.com/package/full-form-control) [![Downloads](https://img.shields.io/npm/dt/full-form-control)](https://www.npmjs.com/package/full-form-control) [![License: MIT](https://img.shields.io/github/license/VolcharaMastering/full-form-control)](https://github.com/VolcharaMastering/full-form-control/blob/main/LICENSE)

`full-form-control` is a lightweight, headless form state manager for React and Next.js. You create one small store per form, bind inputs to it, and get `formValues`, `errors`, `displayErrors` and a single `isValid` flag out of the box. Validation is pluggable: Joi, Zod, Yup, a custom validator, or a map of per-field validators.

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

const validation = {
    type: "custom" as const,
    schema: {
        validate(values: SignupForm) {
            const errors: Record<string, { message: string }> = {};
            if (values.username.length < 3) errors.username = { message: "Enter 3 characters" };
            if (!values.email.includes("@")) errors.email = { message: "Enter a valid email" };
            return errors;
        },
    },
};

export const SignupForm = () => {
    const { formValues, displayErrors, isValid, setFormValues, markFieldTouched } = useForm<SignupForm>({
        username: "",
        email: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormValues({ [name]: value }, validation);
    };

    return (
        <form onSubmit={(event) => event.preventDefault()}>
            <input name="username" value={formValues.username ?? ""} onChange={handleChange} onBlur={() => markFieldTouched("username", validation)} />
            {displayErrors.username && <span>{displayErrors.username}</span>}
            <input name="email" value={formValues.email ?? ""} onChange={handleChange} onBlur={() => markFieldTouched("email", validation)} />
            {displayErrors.email && <span>{displayErrors.email}</span>}
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
    const { formValues, displayErrors, isValid, setFormValues, markFieldTouched } = useFormStore(signupStore);
    // ... same as above
};
```

---

## Features

- **Two usage styles:** `useForm()` for a single form, or `createFormStore()` + `useFormStore()` for multiple forms
- **Direct subscription with `useSyncExternalStore`:** One subscription per component, one re-render per change
- **Pluggable validation:** Joi, Zod, Yup, custom schema, or per-field validators
- **Touched field errors:** Show `displayErrors` in the UI and keep all validation errors in `errors`
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

### Showing errors after a field is touched

`errors` keeps every error returned by the validation schema. Use `displayErrors` for messages in the form UI: it contains only errors for fields passed to `markFieldTouched(fieldPath, config?)`. Call that action on `blur`, using the same field path used in `errors` (for example, `"email"` or `"addresses.0.city"`). Pass `config` to validate even if the user left an empty field without typing. If omitted, the last successful validation config is reused; if there is none, touching the field does not run validation. Before a field is touched, its error stays in `errors` but is absent from `displayErrors`. `isValid` still uses all errors.

`clearFormValues()` resets touched fields and both error objects. A submit attempt does not automatically mark fields as touched; this package does not provide a submit handler yet.

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
Returns `{ formValues, errors, displayErrors, isValid, setFormValues, markFieldTouched, clearFormValues, destroy }`.

### `createFormStore<T>(initialValues?)`
Creates a store. Pass it to `useFormStore` in any component that reads or writes it.

### `useFormStore<T>(store)`
Subscribes to a store and returns the current state plus action methods.

| Method / Field | Type | Description |
|---|---|---|
| `formValues` | `T` | Current form state |
| `errors` | `Record<string, string>` | All validation errors, including untouched fields |
| `displayErrors` | `Record<string, string>` | Errors for fields marked touched |
| `isValid` | `boolean` | `false` initially, then `true` when valid |
| `setFormValues(partial, config?, mode?)` | Method | Merge values and validate |
| `markFieldTouched(fieldPath, config?)` | Method | Mark one field touched and validate if a config is available |
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
React hook. Subscribes to a `FormStore<T>` with a single `useSyncExternalStore` call and returns the current snapshot plus action methods. Stores created by `createFormStore` also expose `displayErrors` and `markFieldTouched`. Existing custom `IFormStore<T>` implementations can still use the hook with the earlier API.

#### `useFormStoreState<T>(store)`
The hook `useForm` and `useFormStore` both call internally. Exported directly for writing your own wrapper hook without duplicating the `useSyncExternalStore` setup. Accepts anything implementing `IFormStore<T>`.

#### `FormStore<T>` (low-level class)
Public so you can read or write the form outside React (API handlers, utilities, tests). Exposes `formValues`, `defaultData`, `errors` and `isValid` as **read-only** public properties. Always go through `setFormValues` / `clearFormValues` to change state.

**Public methods:**
- `getFormValues(): T`
- `getDefaultData(): T`
- `getErrors(): Record<string, string>`
- `getDisplayErrors(): Record<string, string>`
- `isFormValid(): boolean`
- `getSnapshot(): FormDisplaySnapshot<T>`
- `setFormValues(partial, config?, process?)` — throws after `destroy()`
- `markFieldTouched(fieldPath, config?)` — throws after `destroy()`
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

type FormDisplaySnapshot<T> = FormSnapshot<T> & {
    displayErrors: Record<string, string>;
};

type FormStoreState<T extends object> = FormSnapshot<T> & {
    setFormValues: IFormStore<T>["setFormValues"];
    clearFormValues: IFormStore<T>["clearFormValues"];
    destroy: IFormStore<T>["destroy"];
    unsubscribeFromStore: IFormStore<T>["unsubscribeFromStore"];
};

type TouchedFormStoreState<T extends object> = FormStoreState<T> & {
    displayErrors: Record<string, string>;
    markFieldTouched: (fieldPath: string, config?: ValidationConfig<T>) => void;
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

### 1. Form model types (TypeScript)

Form models can be declared with either `type` or `interface`. Field values and validators keep their declared types:

```ts
type SignupForm = { username: string; email: string };

interface ProfileForm { username: string; email: string }
```

The public store and hook APIs use `T extends object`; no string index signature is required.

The form root must be a plain object, such as `{ email: "" }`. Objects created with `Object.create(null)` are also accepted. Arrays, functions, dates, files, collections, and class instances must be stored inside named fields rather than used as the root. For example, `{ attachments: File[], birthday: Date }` is a valid form model.

TypeScript rejects known unsupported root models when creating a store or calling `useForm`, including arrays, functions, dates, maps, sets, promises, regular expressions, errors, and typed arrays. It cannot reliably distinguish a class instance from an interface with the same fields. Broad types such as `object`, assertions, and JavaScript calls also need runtime checks.

`FormStore` checks `initialValues` and each `setFormValues` update at runtime. An invalid root throws a `TypeError` before values, validation, or subscriptions are changed. Omitted or `undefined` initial values are allowed; an update must always be a plain object. Nested values keep their references; this check does not deep-clone them.

Generic wrappers can forward `...args: FormInitialValues<T>` to `createFormStore<T>(...args)` or `useForm<T>(...args)` to preserve these checks.

### 2. Exceptions in validation schemas are rethrown

If a validation schema throws an unexpected error, `setFormValues` rethrows it. The store keeps the merged values, sets `isValid` to `false`, and notifies subscribers. A newly supplied failing schema does not replace the last successful validation config.

```ts
const schema = {
    validate(data) {
        throw new Error("schema bug");
    }
};
// This throws, and isValid becomes false.
setFormValues({ email: "test" }, { type: "custom", schema });
```

Fix the schema error or catch it where you call `setFormValues`.

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
