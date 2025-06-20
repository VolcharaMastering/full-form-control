# Full-Form-Control

**Full-Form-Control** is a lightweight, headless library for form state and validation management in React & Next.js.  
**⚠️ This library is currently in testing mode**:

- The data-editing module (loading pre-filled form values) is not yet tested.
- Among standard validation libraries, only **Joi** has been verified.
- Built-in validation is **not available** and will be implemented last. The main goal is flexible custom validation.

> ⚠️ TypeScript only for now. JavaScript support is planned.  
> ⚠️ To work with custom validation, make sure your validation result includes an `errors` object and an overall `message` field.

## Features

- **Stateless**: No Redux, MobX, or other external state managers.
- **Flexible validation**: Supports any schema (Joi, Yup, or custom functions).
- **Minimal API**: Simple functions for values, validation, and errors.
- **UI-agnostic**: Works with any component library in React or Next.js.

---

## Install

```bash
npm install full-form-control
```

---

## Quick Start

```ts
import { useFormStore } from 'full-form-control';
import Joi from 'joi';

// 1. Define a Joi schema for validation
const joiSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: false })      // Validate email format
    .required(),                 // Required field

  password: Joi.string()
    .min(6)                      // Minimum length of 6
    .required(),                 // Required field
});

function MyForm() {
  const {
    formValues,     // Current values of form fields
    errors,         // Validation errors: { fieldName: errorMessage }
    isValid,        // Boolean: true if form has no validation errors
    setFormValues,  // Updates values and triggers validation
    clearFormValues // Clears all form values
  } = useFormStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Update form value and validate using Joi schema
    setFormValues(
      { [e.target.name]: e.target.value },
      joiSchema
    );
  };

  return (
    <form>
      {/* Email input */}
      <input
        name="email"
        type="email"
        value={formValues.email || ''}
        onChange={handleChange}
        placeholder="Email"
      />
      {errors.email && <span>{errors.email}</span>}

      {/* Password input */}
      <input
        name="password"
        type="password"
        value={formValues.password || ''}
        onChange={handleChange}
        placeholder="Password"
      />
      {errors.password && <span>{errors.password}</span>}

      {/* Form actions */}
      <button type="submit" disabled={!isValid}>
        Submit
      </button>
      <button type="button" onClick={clearFormValues}>
        Reset
      </button>
    </form>
  );
}
```

---

## Custom Validation

If you use your own validation function (instead of Joi/Yup/Zod), make sure it returns the following shape:

```ts
{
  errors: {
    fieldName: "Error message",
    // other fields ...
  },
  message: "Validation failed"
}
```

Without this structure, the library will not be able to detect and display errors properly.

---

## API

| Function / Property         | Description                                                  |
|----------------------------|--------------------------------------------------------------|
| `formValues`               | Current values of the form fields                            |
| `errors`                   | Object containing validation messages per field              |
| `isValid`                  | `true` if there are no validation errors                     |
| `setFormValues(data, schema?, process?)` | Updates field values, optionally validates |
| `clearFormValues()`        | Resets all form values and errors                            |

---

## Why Full-Form-Control?

- ✅ UI-agnostic: Logic-only, no styling or rendering
- ✅ Supports both sync and async validation
- ✅ Works with Joi, Yup, or fully custom validators
- ✅ Designed for scalability and extensibility

---

## TODO

- [ ] JavaScript support
- [ ] Built-in validators (basic rules)
- [ ] Data-editing (prefilled values) module test
- [ ] More real-world examples and tests
