// Single source of truth for public types used by FormStore and the hook.
// Imported explicitly where needed; no ambient declarations.

// Field-level validator. Returns an error message or null if the value is valid.
export type FieldValidator<Value> = (value: Value) => string | null;

// Map of field validators used when validationConfig.type is "field".
export type FieldValidationSchema<T> = Partial<{
  [K in keyof T]: FieldValidator<T[K]>;
}>;

// Error map returned by generic validators (custom, valibot, superstruct, typia, ajv, vest).
// Keys are field paths, values carry a message.
export type GenericValidationResult = Record<string, { message: string }>;

// Narrow shape of a Joi validation result that the store actually reads.
export type JoiValidationResult = {
  error?: {
    details?: Array<{ path: Array<string | number>; message: string }>;
  };
};

// Narrow shape of a Zod issue and safeParse result.
export type ZodIssue = { path: Array<string | number>; message: string };
export type ZodValidationError = { issues: ZodIssue[] };
export type ZodValidationResult =
  | { success: true }
  | { success: false; error: ZodValidationError };

// Narrow shape of a Yup validation error.
// Yup throws either a single error with path/message or a wrapper with inner[].
export type YupValidationError = {
  inner?: Array<{ path: string; message: string }>;
  path?: string;
  message?: string;
};

// Discriminated union of every validation integration supported by FormStore.
// The store picks a branch by the "type" tag and calls the matching schema method.
export type ValidationConfig<T> =
  | { type: "joi"; schema: { validate: (data: T) => JoiValidationResult } }
  | { type: "zod"; schema: { safeParse: (data: T) => ZodValidationResult } }
  | {
      type: "yup";
      schema: {
        validateSync: (data: T, options?: { abortEarly?: boolean }) => void;
      };
    }
  | {
      type: "valibot" | "superstruct" | "typia" | "ajv" | "vest" | "custom";
      schema: { validate: (data: T) => GenericValidationResult };
    }
  | { type: "field"; schema: FieldValidationSchema<T> };

// Combined snapshot returned by FormStore.getSnapshot.
// The same reference is reused until a mutation, then replaced in notify().
export type FormSnapshot<T> = {
  formValues: T;
  errors: Record<string, string>;
  isValid: boolean;
};

// Public interface implemented by FormStore.
export interface IFormStore<T> {
  formValues: T;
  defaultData: T;
  errors: Record<string, string>;
  isValid: boolean;

  setFormValues(
    data: Partial<T>,
    validationConfig?: ValidationConfig<T>,
    process?: "add" | "edit"
  ): void;
  clearFormValues(): void;
  // Fully disposes the store: clears data and removes all subscribers.
  destroy(): void;
  // Deprecated alias of destroy(). Will be removed in a future major version.
  unsubscribeFromStore(): void;

  getFormValues(): T;
  getDefaultData(): T;
  getErrors(): Record<string, string>;
  isFormValid(): boolean;
  getSnapshot(): FormSnapshot<T>;

  subscribe(callback: () => void): () => void;
  getSubscribersCount(): number;
}
