export type FieldValidator<Value> = (value: Value) => string | null;
export type FieldValidationSchema<T> = Partial<{
    [K in keyof T]: FieldValidator<T[K]>;
}>;
export type GenericValidationResult = Record<string, {
    message: string;
}>;
export type JoiValidationResult = {
    error?: {
        details?: Array<{
            path: Array<string | number>;
            message: string;
        }>;
    };
};
export type ZodIssue = {
    path: PropertyKey[];
    message: string;
};
export type ZodValidationError = {
    issues: ZodIssue[];
};
export type ZodValidationResult = {
    success: true;
} | {
    success: false;
    error: ZodValidationError;
};
export type YupValidationError = {
    inner?: Array<{
        path: string;
        message: string;
    }>;
    path?: string;
    message?: string;
};
export type ValidationConfig<T> = {
    type: "joi";
    schema: {
        validate: (data: T) => JoiValidationResult;
    };
} | {
    type: "zod";
    schema: {
        safeParse: (data: T) => ZodValidationResult;
    };
} | {
    type: "yup";
    schema: {
        validateSync: (data: T, options?: {
            abortEarly?: boolean;
        }) => void;
    };
} | {
    type: "valibot" | "superstruct" | "typia" | "ajv" | "vest" | "custom";
    schema: {
        validate: (data: T) => GenericValidationResult;
    };
} | {
    type: "field";
    schema: FieldValidationSchema<T>;
};
export type FormSnapshot<T> = {
    formValues: T;
    errors: Record<string, string>;
    isValid: boolean;
};
export interface IFormStore<T> {
    formValues: T;
    defaultData: T;
    errors: Record<string, string>;
    isValid: boolean;
    setFormValues(data: Partial<T>, validationConfig?: ValidationConfig<T>, process?: "add" | "edit"): void;
    clearFormValues(): void;
    destroy(): void;
    unsubscribeFromStore(): void;
    getFormValues(): T;
    getDefaultData(): T;
    getErrors(): Record<string, string>;
    isFormValid(): boolean;
    getSnapshot(): FormSnapshot<T>;
    subscribe(callback: () => void): () => void;
    getSubscribersCount(): number;
}
