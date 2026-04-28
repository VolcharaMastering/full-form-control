import type {
  FieldValidationSchema,
  FormSnapshot,
  GenericValidationResult,
  IFormStore,
  JoiValidationResult,
  ValidationConfig,
  YupValidationError,
  ZodValidationError,
  ZodValidationResult,
} from "./types";

// Re-export snapshot type so consumers can `import { FormSnapshot } from "full-form-control"`.
export type {
  FieldValidationSchema,
  FieldValidator,
  FormSnapshot,
  GenericValidationResult,
  IFormStore,
  ValidationConfig,
} from "./types";

export class FormStore<T extends Record<string, unknown>>
  implements IFormStore<T>
{
  public formValues: T;
  public defaultData: T;
  public errors: Record<string, string> = {};
  public isValid: boolean = false;

  private subscribers: Set<() => void> = new Set();
  private cachedSnapshot: FormSnapshot<T>;

  public setFormValues: (
    data: Partial<T>,
    schema?: ValidationConfig<T>,
    process?: "add" | "edit"
  ) => void;

  constructor(initialValues?: T) {
    this.formValues = initialValues ? { ...initialValues } : ({} as T);
    this.defaultData = initialValues ? { ...initialValues } : ({} as T);
    this.isValid = this.computeIsValid();
    this.setFormValues = this._setFormValues.bind(this);
    this.cachedSnapshot = this.buildSnapshot();
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
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
    return (
      Object.keys(this.errors).length === 0 &&
      Object.keys(this.formValues).length > 0
    );
  }

  private _setFormValues(
    data: Partial<T>,
    validationConfig?: ValidationConfig<T>,
    process: "add" | "edit" = "add"
  ): void {
    // In edit mode with empty initial state, treat the first payload as the
    // baseline data for the form.
    if (!Object.keys(this.formValues).length && process === "edit") {
      this.formValues = { ...(data as T) };
      this.defaultData = { ...(data as T) };
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
  private runValidation(
    config: ValidationConfig<T>,
    changed: Partial<T>
  ): void {
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

  private applyJoi(schema: {
    validate: (data: T) => JoiValidationResult;
  }): void {
    const result = schema.validate(this.formValues);
    this.handleJoiError(result.error);
  }

  private applyZod(schema: {
    safeParse: (data: T) => ZodValidationResult;
  }): void {
    const result = schema.safeParse(this.formValues);
    if (!result.success) this.handleZodError(result.error);
    else this.errors = {};
  }

  private applyYup(schema: {
    validateSync: (data: T, options?: { abortEarly?: boolean }) => void;
  }): void {
    try {
      schema.validateSync(this.formValues, { abortEarly: false });
      this.errors = {};
    } catch (err: unknown) {
      this.handleYupError(err as YupValidationError);
    }
  }

  private applyGeneric(schema: {
    validate: (data: T) => GenericValidationResult;
  }): void {
    const result = schema.validate(this.formValues);
    this.handleGenericValidationError(result);
  }

  private applyField(
    schema: FieldValidationSchema<T>,
    changed: Partial<T>
  ): void {
    const keys = Object.keys(changed) as Array<Extract<keyof T, string>>;
    for (const key of keys) {
      const validator = schema[key];
      if (!validator) continue;
      const error = validator(this.formValues[key]);
      if (error) this.errors[key] = error;
      else delete this.errors[key];
    }
  }

  clearFormValues(): void {
    this.formValues = {} as T;
    this.defaultData = {} as T;
    this.errors = {};
    this.isValid = this.computeIsValid();
    this.notify();
  }

  // Fully disposes the store: clears data and all subscribers.
  // Use this when the form component unmounts or the route changes.
  destroy(): void {
    this.clearFormValues();
    this.subscribers.clear();
  }

  // Deprecated. Prefer destroy(). Kept for one major version to avoid
  // breaking existing consumers.
  /** @deprecated Use destroy() instead. */
  unsubscribeFromStore(): void {
    this.destroy();
  }

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

  // Single combined snapshot consumed by useFormStore through
  // useSyncExternalStore. The same reference is returned between notifies,
  // so React can skip re-renders when nothing changed.
  getSnapshot(): FormSnapshot<T> {
    return this.cachedSnapshot;
  }

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
      this.errors[issue.path.join(".")] = issue.message;
    }
  }

  private handleYupError(error: YupValidationError): void {
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

  private handleGenericValidationError(
    errorMap: GenericValidationResult
  ): void {
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
