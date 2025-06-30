/* eslint-disable @typescript-eslint/no-explicit-any */
export class FormStore {
    constructor(initialValues) {
        this.errors = {};
        this.isValid = false;
        this.subscribers = new Set();
        this.formValues = initialValues ? { ...initialValues } : {};
        this.defaultData = initialValues ? { ...initialValues } : {};
        this.isValid = Boolean(initialValues);
        this.setFormValues = this._setFormValues.bind(this);
    }
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }
    notify() {
        this.subscribers.forEach((cb) => cb());
    }
    _setFormValues(data, validationConfig, process = "add") {
        // If edit mode and initial state is empty, override form and default data
        if (!Object.keys(this.formValues).length && process === "edit") {
            this.formValues = { ...data };
            this.defaultData = { ...data };
        }
        // Merge partial data into form state
        this.formValues = { ...this.formValues, ...data };
        // Run schema-based validation
        if (validationConfig) {
            switch (validationConfig.type) {
                case "joi": {
                    const result = validationConfig.schema.validate(this.formValues);
                    this.handleJoiError(result.error);
                    break;
                }
                case "zod": {
                    const result = validationConfig.schema.safeParse(this.formValues);
                    if (!result.success && result.error)
                        this.handleZodError(result.error);
                    else
                        this.errors = {};
                    break;
                }
                case "yup": {
                    try {
                        validationConfig.schema.validateSync(this.formValues, { abortEarly: false });
                        this.errors = {};
                    }
                    catch (err) {
                        this.handleYupError(err);
                    }
                    break;
                }
                case "valibot":
                case "superstruct":
                case "typia":
                case "ajv":
                case "vest":
                case "custom": {
                    const result = validationConfig.schema.validate(this.formValues);
                    this.handleGenericValidationError(result);
                    break;
                }
                case "field": {
                    const schema = validationConfig.schema;
                    for (const key in data) {
                        const validator = schema[key];
                        if (validator) {
                            const error = validator(this.formValues[key]);
                            if (error)
                                this.errors[key] = error;
                            else
                                delete this.errors[key];
                        }
                    }
                    break;
                }
            }
        }
        // Determine isValid flag
        this.isValid = Object.keys(this.errors).length === 0;
        this.notify();
    }
    clearFormValues() {
        this.formValues = {};
        this.defaultData = {};
        this.errors = {};
        this.isValid = false;
        this.notify();
    }
    unsubscribeFromStore() {
        this.clearFormValues();
        this.subscribers.clear();
    }
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
    handleJoiError(error) {
        this.errors = {};
        if (error?.details) {
            for (const d of error.details) {
                if (d.path && d.message) {
                    this.errors[d.path.join(".")] = d.message;
                }
            }
        }
    }
    handleZodError(error) {
        this.errors = {};
        for (const issue of error.issues) {
            this.errors[issue.path.join(".")] = issue.message;
        }
    }
    handleYupError(error) {
        this.errors = {};
        if (error.inner) {
            for (const err of error.inner) {
                this.errors[err.path] = err.message;
            }
        }
        else if (error.path && error.message) {
            this.errors[error.path] = error.message;
        }
    }
    handleGenericValidationError(errorMap) {
        this.errors = {};
        if (errorMap && typeof errorMap === "object") {
            for (const key in errorMap) {
                const err = errorMap[key];
                if (err?.message) {
                    this.errors[key] = err.message;
                }
            }
        }
    }
}
