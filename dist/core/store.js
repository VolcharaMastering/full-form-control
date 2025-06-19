export class FormStore {
    constructor(initialValues) {
        // If initialValues provided, set formValues and defaultData to initialValues, else empty objects
        this.formValues = initialValues ? { ...initialValues } : {};
        this.defaultData = initialValues ? { ...initialValues } : {};
        this.errors = {};
        this.isValid = Boolean(initialValues);
        this.subscribers = new Set();
        this.setFormValues = this._setFormValues.bind(this);
    }
    // ====== Subscribe to changes ======
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => {
            this.subscribers.delete(callback);
        };
    }
    notify() {
        this.subscribers.forEach((cb) => cb());
    }
    // ======= Main method: setFormValues =======
    _setFormValues(data, schema, process = "add") {
        // If "edit" and formValues is empty, set data as formValues and defaultData
        if (!Object.keys(this.formValues).length && process === "edit") {
            this.formValues = { ...data };
            this.defaultData = { ...data };
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
                    const result = schema.validate(this.formValues);
                    if (result instanceof Promise) {
                        result.catch((error) => {
                            this.handleValidationError(error);
                            this.notify();
                        });
                    }
                    else {
                        this.handleValidationResult(result);
                    }
                }
                catch (error) {
                    this.handleValidationError(error);
                }
            }
            else {
                // FieldValidator schema
                Object.keys(data).forEach((key) => {
                    const fieldKey = key;
                    const validator = schema[fieldKey];
                    if (validator) {
                        const maybeError = validator(this.formValues[fieldKey]);
                        if (maybeError) {
                            this.errors[String(fieldKey)] = maybeError;
                        }
                        else {
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
                return this.defaultData[k] === this.formValues[k];
            });
            if (Object.keys(this.defaultData).length !== Object.keys(this.formValues).length) {
                hasChanges = true;
            }
        }
        if (Object.keys(this.errors).length > 0) {
            this.isValid = false;
        }
        else {
            if (defaultKeys.length > 0) {
                this.isValid = hasChanges;
            }
            else {
                this.isValid = Object.keys(this.formValues).length > 0;
            }
        }
        this.notify();
    }
    // ======= Reset all data =======
    clearFormValues() {
        this.formValues = {};
        this.defaultData = {};
        this.errors = {};
        this.isValid = false;
        this.subscribers.clear();
        this.notify();
    }
    // ========== Getters ==========
    getFormValues() {
        return this.formValues;
    }
    getDefaultData() {
        return this.defaultData;
    }
    getErrors() {
        return this.errors;
    }
    isFormValid() {
        return this.isValid;
    }
    getSubscribersCount() {
        return this.subscribers.size;
    }
    handleValidationError(error) {
        // Check for "message" field in error
        if (error && error.message) {
            if (error.details) {
                // Joi-style errors
                this.errors = error.details.reduce((acc, err) => {
                    if (err.path && err.path.length) {
                        acc[err.path.join(".")] = err.message;
                    }
                    return acc;
                }, {});
            }
            else {
                // Generic error
                this.errors = { [error.path || "form"]: error.message };
            }
        }
        else {
            // No message field
            this.errors = { form: "Validation failed. Unknown error." };
        }
    }
    handleValidationResult(result) {
        // Check for "error" field in result
        if (result && typeof result === "object" && "error" in result) {
            const error = result.error;
            if (error) {
                if (error.message) {
                    if (error.details) {
                        this.errors = error.details.reduce((acc, err) => {
                            if (err.path && err.path.length) {
                                acc[err.path.join(".")] = err.message;
                            }
                            return acc;
                        }, {});
                    }
                    else {
                        this.errors = { [error.path || "form"]: error.message };
                    }
                }
                else {
                    this.errors = { form: "Validation failed. Unknown error." };
                }
            }
            else {
                this.errors = {};
            }
        }
        else {
            this.errors = {};
        }
    }
}
