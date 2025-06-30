# full-form-control [![npm version](https://img.shields.io/npm/v/full-form-control)](https://www.npmjs.com/package/full-form-control) [![Downloads](https://img.shields.io/npm/dt/full-form-control)](https://www.npmjs.com/package/full-form-control) [![License: MIT](https://img.shields.io/github/license/VolcharaMastering/full-form-control)](https://github.com/VolcharaMastering/full-form-control/blob/main/LICENSE)  

`full-form-control` is a React hook library for managing complete form state and validation in one place. It provides an internal form store so you don’t need external state management. You can initialize it with default values and validation rules, then bind inputs as controlled components. The form values and errors are kept in React state and updated via `onChange` handlers – as the React docs note, with controlled components “the input’s value is always driven by the React state”. This package works with React 18+ out of the box and is written in TypeScript for type safety and developer-friendly errors.  

## Features  

- **Comprehensive form state:** Manages all form values (`formValues`) and validation errors (`errors`) internally, with no extra Redux/Zustand/etc. needed.  
- **Validation-ready:** Supports custom validation and popular schema libraries (e.g. Joi, Zod, Yup) for validating inputs.  
- **Simple API:** Returns useful properties/methods (`formValues`, `errors`, `isValid`, `setFormValues`, `clearFormValues`, `unsubscribeFromStore`) for easy form handling (see API table below).  
- **TypeScript support:** Written in TS; forms and schemas can be strongly typed.  
- **React 18+ compatible:** Safe to use with Concurrent Mode, Suspense, etc. (standard controlled components pattern).  
- **Lightweight:** Minimal dependencies; no external state or context setup needed.  

## Installation  

Install via NPM (or Yarn):  
```bash
npm install full-form-control
```  

## API  

Using `useFormStore()` (imported from `'full-form-control'`) returns an object with the following properties and methods:

| Property / Method        | Description                                                                             |
|--------------------------|-----------------------------------------------------------------------------------------|
| `formValues`             | Current form values (an object keyed by field name)                                     |
| `errors`                 | Current validation errors (object with same keys; each value is an object with a `message`) |
| `isValid`                | Boolean; `true` if there are **no** validation errors                                   |
| `setFormValues`          | Function to update form values. Typically called as `setFormValues(fieldName, value)`. |
| `clearFormValues`        | Function to reset/clear all form values back to initial (or empty) state.              |
| `unsubscribeFromStore`   | Function to unsubscribe any internal listeners (call if needed on unmount).            |

> **Example:** In your component, call `const form = useFormStore({ /* options */ })`. Then access `form.formValues`, `form.errors`, etc. You might use `const { formValues, setFormValues, errors, isValid } = form;` to work with them directly.  

You can try on this npm on Playcode: [testForm for full-form-control](https://playcode.io/2442479)

## Quick Start  

Use the `useFormStore` hook to manage your form. For example:  
```jsx
import { useFormStore } from "full-form-control";

function SignupForm() {
  const { formValues, setFormValues, errors, isValid } = useFormStore({
    initialValues: { username: "", email: "" },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues(name, value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="username" value={formValues.username || ""} onChange={handleChange} />
      <input name="email" value={formValues.email || ""} onChange={handleChange} />
      {errors.username && <span>{errors.username.message}</span>}
      {errors.email && <span>{errors.email.message}</span>}
    </form>
  );
}
```

### Examples: Validation Schemas  

You can plug in validation schemas from libraries like Joi, Zod, or Yup. Each example below shows defining a schema; you would then pass it into `useFormStore`.

<details><summary><strong>Joi</strong></summary>

```js
const Joi = require("joi");

const schema = Joi.object({
  username: Joi.string().alphanum().min(3).required(),
  password: Joi.string().min(6).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required()
});
```
</details>

<details><summary><strong>Zod</strong></summary>

```js
import { z } from "zod";

const schema = z.object({
  username: z.string().min(3, "Must be 3+ chars"),
  age: z.number().int().nonnegative().optional(),
  email: z.string().email()
});
```
</details>

<details><summary><strong>Yup</strong></summary>

```js
import * as Yup from "yup";

const schema = Yup.object().shape({
  username: Yup.string().min(3, "Too short").required("Required"),
  email: Yup.string().email("Invalid email").required("Required")
});
```
</details>

<details><summary><strong>Custom Validator</strong></summary>

```js
const customValidator = (values) => {
  const errors = {};
  if (values.username && values.username.length < 3) {
    errors.username = { message: "Too short" };
  }
  if (values.email && !values.email.includes("@")) {
    errors.email = { message: "Invalid email" };
  }
  return errors;
};
```
</details>

## Custom Validation Schema Structure  

When writing your own validation logic or adapter, make sure the result is an “errors” object keyed by form fields. Each entry should be an object with a `message` string, e.g.: `{ email: { message: "Invalid email" } }`. Keeping this structure ensures that errors for each field can be accessed and displayed easily.

## Changelog & Links  

See [CHANGELOG.md](CHANGELOG.md) for release notes and version history.  
GitHub: [VolcharaMastering/full-form-control](https://github.com/VolcharaMastering/full-form-control)

## TODO  

- Add validation library support: **valibot**, **superstruct**, **typia**, **ajv**, **vest**.  
- Add built-in HTML validation support  
- Add JS (non-TS) support