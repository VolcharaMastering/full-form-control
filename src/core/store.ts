import type {
    CustomSchema,
    FieldValidationSchema,
    FormSnapshot,
    GenericValidationResult,
    IFormStore,
    JoiSchema,
    JoiValidationResult,
    ValidationConfig,
    ValidationType,
    YupSchema,
    YupValidationError,
    ZodSchema,
    ZodValidationError,
} from "./types.js";

// See DESIGN_NOTES.md for the reasoning behind the non-obvious decisions
// in this file. Comments below just describe what the code does.

// Keep this list in sync with ValidationType in types.ts.
const VALIDATION_TYPES: readonly ValidationType[] = ["joi", "zod", "yup", "custom", "field"];

const isValidationType = (type: string): type is ValidationType =>
    (VALIDATION_TYPES as readonly string[]).includes(type);

// Checks the exception's shape instead of requiring name === "ValidationError".
const isYupValidationError = (err: unknown): err is YupValidationError => {
    if (typeof err !== "object" || err === null) return false;
    const candidate = err as Record<string, unknown>;
    return (
        candidate.name === "ValidationError" ||
        Array.isArray(candidate.inner) ||
        typeof candidate.path === "string"
    );
};

export class FormStore<T extends Record<string, unknown>> implements IFormStore<T> {
    public formValues: T;
    public defaultData: T;
    public errors: Record<string, string> = {};
    public isValid: boolean = false;

    private subscribers: Set<() => void> = new Set();
    private cachedSnapshot: FormSnapshot<T>;
    private isEditMode: boolean = false;
    // True once the first "edit" call captured defaultData as a baseline.
    private hasEditBaseline: boolean = false;
    // Config from the most recent setFormValues call that included one.
    private lastValidationConfig?: ValidationConfig<T>;
    // True after destroy(). Blocks further setFormValues()/clearFormValues()
    // calls; subscribe() stays a safe no-op instead of throwing.
    private isDestroyed: boolean = false;
    // Copy of the values the store was created with. clearFormValues()
    // restores this instead of wiping to {}.
    private readonly initialValues: T;

    constructor(initialValues?: T) {
        this.initialValues = initialValues ? { ...initialValues } : ({} as T);
        this.formValues = { ...this.initialValues };
        this.defaultData = { ...this.initialValues };
        // isValid starts false regardless of initialValues; it becomes
        // accurate once the first setFormValues call recomputes it.
        this.isValid = false;
        this.cachedSnapshot = this.buildSnapshot();
    }

    // subscribe, getSnapshot and the action methods below are arrow
    // properties, not prototype methods, so their reference stays stable
    // across the store's whole lifetime. See DESIGN_NOTES.md.

    // Safe no-op after destroy(): logs a warning and returns a no-op
    // unsubscribe function instead of throwing.
    subscribe = (callback: () => void): (() => void) => {
        if (this.isDestroyed) {
            console.warn(
                "FormStore: subscribe() called after destroy(). Ignoring; create a new store instead of reusing this instance."
            );
            return () => {};
        }
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    };

    private assertNotDestroyed(): void {
        if (this.isDestroyed) {
            throw new Error(
                "FormStore: destroy() already disposed this store. Create a new store instead of reusing this instance, or call clearFormValues() if you only meant to reset the form."
            );
        }
    }

    // Build a fresh snapshot from the current store fields.
    private buildSnapshot(): FormSnapshot<T> {
        return {
            formValues: this.formValues,
            errors: this.errors,
            isValid: this.isValid,
        };
    }

    // Replace the cached snapshot and then call all subscribers.
    // The new reference is what useSyncExternalStore reads on the next render.
    private notify() {
        this.cachedSnapshot = this.buildSnapshot();
        this.subscribers.forEach((cb) => cb());
    }

    // isValid is true only when there are no errors AND the form has some data.
    // An empty form is treated as "not ready to submit", which is safer for
    // disabling submit buttons by default.
    private computeIsValid(): boolean {
        const hasData = Object.keys(this.formValues).length > 0;
        if (!hasData) return false;

        const hasErrors = Object.keys(this.errors).length > 0;
        if (hasErrors) return false;

        if (this.isEditMode) {
            return this.hasChangesComparedToDefault();
        }

        // No errors and at least one field, checked above, is already enough.
        return true;
    }

    private hasChangesComparedToDefault(): boolean {
        const currentKeys = Object.keys(this.formValues) as Array<Extract<keyof T, string>>;
        const defaultKeys = Object.keys(this.defaultData) as Array<Extract<keyof T, string>>;

        const allKeys = new Set<Extract<keyof T, string>>([...currentKeys, ...defaultKeys]);

        for (const key of allKeys) {
            if (!Object.is(this.formValues[key], this.defaultData[key])) return true;
        }

        return false;
    }

    setFormValues = (
        data: Partial<T>,
        validationConfig?: ValidationConfig<T>,
        process: "add" | "edit" = "add"
    ): void => {
        this.assertNotDestroyed();

        if (process === "edit") {
            this.isEditMode = true;
        }

        // Merge first, so an edit baseline captured below includes this call's data.
        this.formValues = { ...this.formValues, ...data };

        // Captures defaultData as a baseline once, on the first edit call.
        if (process === "edit" && !this.hasEditBaseline) {
            this.defaultData = { ...this.formValues };
            this.hasEditBaseline = true;
        }

        // Reuses the last config when this call omits one.
        const config = validationConfig ?? this.lastValidationConfig;
        if (config) {
            // finally keeps isValid and notify running even if the schema throws.
            try {
                this.runValidation(config, data);
                this.lastValidationConfig = config;
            } finally {
                this.isValid = this.computeIsValid();
                this.notify();
            }
            return;
        }

        this.isValid = this.computeIsValid();
        this.notify();
    };

    // Picks the handler by the type tag. Unknown tags throw, so a typo cannot
    // leave isValid true with no validation. Unreleased tags (valibot,
    // superstruct, typia, ajv, vest) stay commented in types.ts until ready.
    private runValidation(config: ValidationConfig<T>, changed: Partial<T>): void {
        const typeTag: string = config.type;
        if (!isValidationType(typeTag)) {
            throw new Error(
                `FormStore: unknown validation type "${typeTag}". Use "joi", "zod", "yup", "custom" or "field".`
            );
        }

        if (config.type === "joi") {
            this.applyJoi(config.schema);
            return;
        }
        if (config.type === "zod") {
            this.applyZod(config.schema);
            return;
        }
        if (config.type === "yup") {
            this.applyYup(config.schema);
            return;
        }
        if (config.type === "custom") {
            this.applyCustom(config.schema);
            return;
        }

        // Not released yet. Uncomment when the adapter is ready, and uncomment
        // the matching variant in types.ts:
        // if (config.type === "valibot") {
        //     this.applyCustom(config.schema);
        //     return;
        // }
        // if (config.type === "superstruct") {
        //     this.applyCustom(config.schema);
        //     return;
        // }
        // if (config.type === "typia") {
        //     this.applyCustom(config.schema);
        //     return;
        // }
        // if (config.type === "ajv") {
        //     this.applyCustom(config.schema);
        //     return;
        // }
        // if (config.type === "vest") {
        //     this.applyCustom(config.schema);
        //     return;
        // }

        this.applyField(config.schema, changed);
    }

    private applyJoi(schema: JoiSchema<T>): void {
        // Collects every field error instead of stopping at the first one.
        const result = schema.validate(this.formValues, { abortEarly: false });
        this.handleJoiError(result.error);
    }

    private applyZod(schema: ZodSchema<T>): void {
        const result = schema.safeParse(this.formValues);
        if (!result.success) this.handleZodError(result.error);
        else this.errors = {};
    }

    private applyYup(schema: YupSchema<T>): void {
        try {
            schema.validateSync(this.formValues, { abortEarly: false });
            this.handleYupError(undefined);
        } catch (err: unknown) {
            // Rethrows anything that is not a real ValidationError.
            if (!isYupValidationError(err)) throw err;
            this.handleYupError(err);
        }
    }

    private applyCustom(schema: CustomSchema<T>): void {
        const result = schema.validate(this.formValues);
        this.handleGenericValidationError(result);
    }

    private applyField(schema: FieldValidationSchema<T>, changed: Partial<T>): void {
        // Copies errors before mutating, like every other apply* handler.
        const nextErrors = { ...this.errors };
        const keys = Object.keys(changed) as Array<Extract<keyof T, string>>;
        for (const key of keys) {
            const validator = schema[key];
            if (!validator) continue;
            const error = validator(this.formValues[key]);
            if (error) nextErrors[key] = error;
            else delete nextErrors[key];
        }
        this.errors = nextErrors;
    }

    // Restores formValues/defaultData to initialValues; keeps subscribers.
    clearFormValues = (): void => {
        this.assertNotDestroyed();
        this.resetState(this.initialValues);
        this.notify();
    };

    // Shared reset logic for clearFormValues() and destroy(). The caller
    // decides whether to notify.
    private resetState(base: T): void {
        this.formValues = { ...base };
        this.defaultData = { ...base };
        this.errors = {};
        this.isEditMode = false;
        this.hasEditBaseline = false;
        this.lastValidationConfig = undefined;
        // isValid starts false after any reset, same as the constructor.
        this.isValid = false;
    }

    // Fully disposes the store: clears data, removes every subscriber, and
    // rejects further setFormValues()/clearFormValues() calls. Calling it
    // more than once is a harmless no-op. See "Disposing a store" in README.md.
    destroy = (): void => {
        if (this.isDestroyed) return;
        this.resetState({} as T);
        this.subscribers.clear();
        this.isDestroyed = true;
    };

    // Deprecated alias, removed in the next major version.
    /** @deprecated Use destroy() instead. */
    unsubscribeFromStore = (): void => {
        this.destroy();
    };

    getFormValues(): T {
        return this.formValues;
    }

    getDefaultData(): T {
        return this.defaultData;
    }

    getErrors(): Record<string, string> {
        return this.errors;
    }

    isFormValid(): boolean {
        return this.isValid;
    }

    // Cached snapshot for useSyncExternalStore; same reference until the next notify().
    getSnapshot = (): FormSnapshot<T> => {
        return this.cachedSnapshot;
    };

    getSubscribersCount(): number {
        return this.subscribers.size;
    }

    private handleJoiError(error?: JoiValidationResult["error"]): void {
        this.errors = {};
        if (!error?.details) return;
        for (const d of error.details) {
            if (d.path && d.message) {
                this.errors[d.path.join(".")] = d.message;
            }
        }
    }

    private handleZodError(error: ZodValidationError): void {
        this.errors = {};
        for (const issue of error.issues) {
            const pathKey = issue.path.map((part) => String(part)).join(".");
            this.errors[pathKey] = issue.message;
        }
    }

    private handleYupError(error?: YupValidationError): void {
        this.errors = {};
        if (!error) return;
        if (error.inner && error.inner.length > 0) {
            for (const err of error.inner) {
                this.errors[err.path] = err.message;
            }
            return;
        }
        if (error.path && error.message) {
            this.errors[error.path] = error.message;
        }
    }

    private handleGenericValidationError(errorMap: GenericValidationResult): void {
        this.errors = {};
        if (!errorMap || typeof errorMap !== "object") return;
        for (const key in errorMap) {
            const err = errorMap[key];
            if (err?.message) {
                this.errors[key] = err.message;
            }
        }
    }
}

// Factory for per-form store instances.
// Call once per form (module level or inside a parent with useRef).
// Pass the returned store to useFormStore in any component that needs it.
export const createFormStore = <T extends Record<string, unknown>>(
    initialValues?: T
): FormStore<T> => new FormStore<T>(initialValues);
