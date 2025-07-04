// Base interface for any validation schema
interface ValidationSchemaInterface<T> {
    validate: (data: Partial<T>) => Promise<void> | void | { value: T; error?: any };
}

// Field validator function type
// External code can implement its own logic
type FieldValidator<Value> = (value: Value) => string | null;

// Validation schema (generic by form)
// Can be an object with validators for each field or any schema implementing ValidationSchemaInterface
type ValidationSchema<T> =
    | Partial<{
          [K in keyof T]: FieldValidator<T[K]>;
      }>
    | ValidationSchemaInterface<T>
    | ObjectSchema<T>;

// Main form state 
interface IFormStore<T> {
    // Current form data
    formValues: T;
    // Initial/default data
    defaultData?: T;
    // Field errors (keys match T)
    errors?: Record<string, string>;
    // Is form valid
    isValid: boolean;

    // Methods
    setFormValues(data: Partial<T>, schema?: ValidationSchema<T>, process?: "add" | "edit"): void;
    clearFormValues(): void;

    // Read-only getters
    getFormValues(): T;
    getDefaultData(): T;
    getErrors(): Record<string, string>;
    isFormValid(): boolean;

    // Subscribe to changes
    subscribe(callback: () => void): () => void;
}

// Types for different validation schema kinds
type SchemaType = "joi" | "zod" | "yup" | "field" | "valibot" | "superstruct" | "typia" | "ajv" | "vest" | "custom";

type ValidationConfig<T> =
  | { type: "joi"; schema: { validate: (data: T) => { error?: unknown } } }
  | { type: "zod"; schema: { safeParse: (data: T) => { success: boolean; error?: any } } }
  | { type: "yup"; schema: { validateSync: (data: T, options?: any) => void } }
  | { type: "valibot" | "superstruct" | "typia" | "ajv" | "vest" | "custom"; schema: { validate: (data: T) => any } }
  | { type: "field"; schema: ValidationSchema<T> };

type FieldValidator<Value> = (value: Value) => string | null;

type ValidationSchema<T> = Partial<{
  [K in keyof T]: FieldValidator<T[K]>;
}>;

interface IFormStore<T> {
  formValues: T;
  defaultData: T;
  errors: Record<string, string>;
  isValid: boolean;

  setFormValues(data: Partial<T>, validationConfig?: ValidationConfig<T>, process?: "add" | "edit"): void;
  clearFormValues(): void;
  unsubscribeFromStore(): void;

  getFormValues(): T;
  getDefaultData(): T;
  getErrors(): Record<string, string>;
  isFormValid(): boolean;
  subscribe(callback: () => void): () => void;
  getSubscribersCount(): number;
}
