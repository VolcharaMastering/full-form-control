export class FormStore<T extends Record<string, any>> implements IFormStore<T> {
    public formValues: T;
    public defaultData: T;
    public errors: Record<string, string>;
    public isValid: boolean;

    private subscribers: Set<() => void>;
    public setFormValues: (
        data: Partial<T>,
        schema?: ValidationSchema<T>,
        process?: "add" | "edit"
    ) => void;

    constructor(initialValues?: { [K in keyof T]: T[K] }) {
        // If initialValues provided, set formValues and defaultData to initialValues, else empty objects
        this.formValues = initialValues ? { ...initialValues } : ({} as T);
        this.defaultData = initialValues ? { ...initialValues } : ({} as T);
        this.errors = {};
        this.isValid = Boolean(initialValues);

        this.subscribers = new Set();

        this.setFormValues = this._setFormValues.bind(this);
    }

    // ====== Subscribe to changes ======
    subscribe(callback: () => void): () => void {
        this.subscribers.add(callback);
        return () => {
            this.subscribers.delete(callback);
        };
    }

    private notify() {
        this.subscribers.forEach((cb) => cb());
    }

    // ======= Main method: setFormValues =======
    private _setFormValues(
        data: Partial<T>,
        schema?: ValidationSchema<T>,
        process: "add" | "edit" = "add"
    ): void {
        // If "edit" and formValues is empty, set data as formValues and defaultData
        if (!Object.keys(this.formValues).length && process === "edit") {
            this.formValues = { ...(data as T) };
            this.defaultData = { ...(data as T) };
        }
        // Merge new data with formValues
        this.formValues = {
            ...this.formValues,
            ...data,
        };
        // Run validation if schema exists
        if (schema) {
            if ("validate" in schema) {
                try {
                    const result = (schema as ValidationSchemaInterface<T>).validate(
                        this.formValues as Partial<T>
                    );
                    if (result instanceof Promise) {
                        result.catch((error: any) => {
                            this.handleValidationError(error);
                            this.notify();
                        });
                    } else {
                        this.handleValidationResult(result);
                    }
                } catch (error: any) {
                    this.handleValidationError(error);
                }
            } else {
                // FieldValidator schema
                Object.keys(data).forEach((key) => {
                    const fieldKey = key as keyof T;
                    const validator = schema[fieldKey];
                    if (validator) {
                        const maybeError = validator(this.formValues[fieldKey]);
                        if (maybeError) {
                            this.errors[String(fieldKey)] = maybeError;
                        } else {
                            delete this.errors[String(fieldKey)];
                        }
                    }
                });
            }
        }
        // Compare with defaultData to check for changes
        const defaultKeys = Object.keys(this.defaultData);
        let hasChanges = false;
        if (defaultKeys.length) {
            hasChanges = !defaultKeys.every((k) => {
                return (this.defaultData as any)[k] === (this.formValues as any)[k];
            });
            if (Object.keys(this.defaultData).length !== Object.keys(this.formValues).length) {
                hasChanges = true;
            }
        }
        if (Object.keys(this.errors).length > 0) {
            this.isValid = false;
        } else {
            if (defaultKeys.length > 0) {
                this.isValid = hasChanges;
            } else {
                this.isValid = Object.keys(this.formValues).length > 0;
            }
        }
        this.notify();
    }

    // ======= Reset all data =======
    clearFormValues(): void {
        this.formValues = {} as T;
        this.defaultData = {} as T;
        this.errors = {};
        this.isValid = false;
        this.notify();
    }
    // ======= Unsubscribe from changes =======
    unsubscribeFromStore(): void {
        this.clearFormValues();
        this.subscribers.clear();
    }

    // ========== Getters ==========
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

    getSubscribersCount(): number {
        return this.subscribers.size;
    }

    private handleValidationError(error: any): void {
        // Check for "message" field in error
        if (error && error.message) {
            if (error.details) {
                // Joi-style errors
                this.errors = error.details.reduce((acc: Record<string, string>, err: any) => {
                    if (err.path && err.path.length) {
                        acc[err.path.join(".")] = err.message;
                    }
                    return acc;
                }, {});
            } else {
                // Generic error
                this.errors = { [error.path || "form"]: error.message };
            }
        } else {
            // No message field
            this.errors = { form: "Validation failed. Unknown error." };
        }
    }

    private handleValidationResult(result: any): void {
        // Check for "error" field in result
        if (result && typeof result === "object" && "error" in result) {
            const error = result.error;
            if (error) {
                if (error.message) {
                    if (error.details) {
                        this.errors = error.details.reduce(
                            (acc: Record<string, string>, err: any) => {
                                if (err.path && err.path.length) {
                                    acc[err.path.join(".")] = err.message;
                                }
                                return acc;
                            },
                            {}
                        );
                    } else {
                        this.errors = { [error.path || "form"]: error.message };
                    }
                } else {
                    this.errors = { form: "Validation failed. Unknown error." };
                }
            } else {
                this.errors = {};
            }
        } else {
            this.errors = {};
        }
    }
}
