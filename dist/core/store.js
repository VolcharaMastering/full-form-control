export class FormStore {
    constructor(initialValues) {
        this.errors = {};
        this.isValid = false;
        this.subscribers = new Set();
        this.formValues = initialValues ? { ...initialValues } : {};
        this.defaultData = initialValues ? { ...initialValues } : {};
        this.isValid = this.computeIsValid();
        this.setFormValues = this._setFormValues.bind(this);
        this.cachedSnapshot = this.buildSnapshot();
    }
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }
    // Build a fresh snapshot from the current store fields.
    buildSnapshot() {
        return {
            formValues: this.formValues,
            errors: this.errors,
            isValid: this.isValid,
        };
    }
    // Replace the cached snapshot and then call all subscribers.
    // The new reference is what useSyncExternalStore reads on the next render.
    notify() {
        this.cachedSnapshot = this.buildSnapshot();
        this.subscribers.forEach((cb) => cb());
    }
    // isValid is true only when there are no errors AND the form has some data.
    // An empty form is treated as "not ready to submit", which is safer for
    // disabling submit buttons by default.
    computeIsValid() {
        return (Object.keys(this.errors).length === 0 &&
            Object.keys(this.formValues).length > 0);
    }
    _setFormValues(data, validationConfig, process = "add") {
        // In edit mode with empty initial state, treat the first payload as the
        // baseline data for the form.
        if (!Object.keys(this.formValues).length && process === "edit") {
            this.formValues = { ...data };
            this.defaultData = { ...data };
        }
        // Merge partial data into form state.
        this.formValues = { ...this.formValues, ...data };
        if (validationConfig) {
            this.runValidation(validationConfig, data);
        }
        this.isValid = this.computeIsValid();
        this.notify();
    }
    // Dispatch by config type to a dedicated handler.
    // Keeping each library in its own method makes setFormValues short and
    // makes the list of supported libraries easy to read and to extend.
    runValidation(config, changed) {
        switch (config.type) {
            case "joi":
                return this.applyJoi(config.schema);
            case "zod":
                return this.applyZod(config.schema);
            case "yup":
                return this.applyYup(config.schema);
            case "valibot":
            case "superstruct":
            case "typia":
            case "ajv":
            case "vest":
            case "custom":
                return this.applyGeneric(config.schema);
            case "field":
                return this.applyField(config.schema, changed);
        }
    }
    applyJoi(schema) {
        const result = schema.validate(this.formValues);
        this.handleJoiError(result.error);
    }
    applyZod(schema) {
        const result = schema.safeParse(this.formValues);
        if (!result.success)
            this.handleZodError(result.error);
        else
            this.errors = {};
    }
    applyYup(schema) {
        try {
            schema.validateSync(this.formValues, { abortEarly: false });
            this.errors = {};
        }
        catch (err) {
            this.handleYupError(err);
        }
    }
    applyGeneric(schema) {
        const result = schema.validate(this.formValues);
        this.handleGenericValidationError(result);
    }
    applyField(schema, changed) {
        const keys = Object.keys(changed);
        for (const key of keys) {
            const validator = schema[key];
            if (!validator)
                continue;
            const error = validator(this.formValues[key]);
            if (error)
                this.errors[key] = error;
            else
                delete this.errors[key];
        }
    }
    clearFormValues() {
        this.formValues = {};
        this.defaultData = {};
        this.errors = {};
        this.isValid = this.computeIsValid();
        this.notify();
    }
    // Fully disposes the store: clears data and all subscribers.
    // Use this when the form component unmounts or the route changes.
    destroy() {
        this.clearFormValues();
        this.subscribers.clear();
    }
    // Deprecated. Prefer destroy(). Kept for one major version to avoid
    // breaking existing consumers.
    /** @deprecated Use destroy() instead. */
    unsubscribeFromStore() {
        this.destroy();
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
    // Single combined snapshot consumed by useFormStore through
    // useSyncExternalStore. The same reference is returned between notifies,
    // so React can skip re-renders when nothing changed.
    getSnapshot() {
        return this.cachedSnapshot;
    }
    getSubscribersCount() {
        return this.subscribers.size;
    }
    handleJoiError(error) {
        this.errors = {};
        if (!error?.details)
            return;
        for (const d of error.details) {
            if (d.path && d.message) {
                this.errors[d.path.join(".")] = d.message;
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
    handleGenericValidationError(errorMap) {
        this.errors = {};
        if (!errorMap || typeof errorMap !== "object")
            return;
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
export const createFormStore = (initialValues) => new FormStore(initialValues);
