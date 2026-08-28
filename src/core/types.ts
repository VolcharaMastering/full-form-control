// Single source of truth for public types used by FormStore and the hook.
// Imported explicitly where needed; no ambient declarations.

// Field-level validator. Returns an error message or null if the value is valid.
export type FieldValidator<Value> = (value: Value) => string | null;

// Map of field validators used when validationConfig.type is "field".
export type FieldValidationSchema<T> = Partial<{
    [K in keyof T]: FieldValidator<T[K]>;
}>;

// Error map returned by a custom validator.
// Keys are field paths, values carry a message.
export type GenericValidationResult = Record<string, { message: string }>;

// Narrow shape of a Joi validation result that the store actually reads.
export type JoiValidationResult = {
    error?: {
        details?: Array<{ path: Array<string | number>; message: string }>;
    };
};

// Narrow shape of a Zod issue and safeParse result.
export type ZodIssue = { path: PropertyKey[]; message: string };
export type ZodValidationError = { issues: ZodIssue[] };
export type ZodValidationResult = { success: true } | { success: false; error: ZodValidationError };

// Narrow shape of a Yup validation error.
// Yup throws either a single error with path/message or a wrapper with inner[].
export type YupValidationError = {
    inner?: Array<{ path: string; message: string }>;
    path?: string;
    message?: string;
};

// Closed list of validation tags the store accepts today.
// A wrong literal (for example "zodd" or "valibot") is a type error in the
// consumer's project after they install this package.
export type ValidationType = "joi" | "zod" | "yup" | "custom" | "field";

export type JoiSchema<T> = {
    validate: (data: T, options?: { abortEarly?: boolean }) => JoiValidationResult;
};

export type ZodSchema<T> = { safeParse: (data: T) => ZodValidationResult };

export type YupSchema<T> = {
    validateSync: (data: T, options?: { abortEarly?: boolean }) => void;
};

export type CustomSchema<T> = { validate: (data: T) => GenericValidationResult };

// Discriminated union of every validation integration supported by FormStore.
// The store picks a branch by the "type" tag and calls the matching schema method.
export type ValidationConfig<T> =
    | { type: "joi"; schema: JoiSchema<T> }
    | { type: "zod"; schema: ZodSchema<T> }
    | { type: "yup"; schema: YupSchema<T> }
    | { type: "custom"; schema: CustomSchema<T> }
    | { type: "field"; schema: FieldValidationSchema<T> };
// Not released yet. Uncomment the matching adapter in store.ts when ready:
// | { type: "valibot"; schema: CustomSchema<T> }
// | { type: "superstruct"; schema: CustomSchema<T> }
// | { type: "typia"; schema: CustomSchema<T> }
// | { type: "ajv"; schema: CustomSchema<T> }
// | { type: "vest"; schema: CustomSchema<T> }

// Combined snapshot returned by FormStore.getSnapshot.
// The same reference is reused until a mutation, then replaced in notify().
export type FormSnapshot<T> = {
    formValues: T;
    errors: Record<string, string>;
    isValid: boolean;
};

// Public interface implemented by FormStore. useFormStore and useForm accept
// anything shaped like this, not just instances returned by createFormStore.
//
// subscribe and getSnapshot are read off the store object and called directly
// by useSyncExternalStore, without the store as the receiver. A custom
// implementation needs both methods to work correctly on their own, for
// example as arrow function properties bound to the instance, the same way
// FormStore itself defines them, not as plain prototype methods that read
// `this`.
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
