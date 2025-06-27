/* eslint-disable @typescript-eslint/no-explicit-any */

export class FormStore<T extends Record<string, any>> implements IFormStore<T> {
  public formValues: T;
  public defaultData: T;
  public errors: Record<string, string> = {};
  public isValid: boolean = false;

  private subscribers: Set<() => void> = new Set();
  public setFormValues: (
    data: Partial<T>,
    schema?: ValidationConfig<T>,
    process?: "add" | "edit"
  ) => void;

  constructor(initialValues?: { [K in keyof T]: T[K] }) {
    this.formValues = initialValues ? { ...initialValues } : ({} as T);
    this.defaultData = initialValues ? { ...initialValues } : ({} as T);
    this.isValid = Boolean(initialValues);
    this.setFormValues = this._setFormValues.bind(this);
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.subscribers.forEach((cb) => cb());
  }

  private _setFormValues(
    data: Partial<T>,
    validationConfig?: ValidationConfig<T>,
    process: "add" | "edit" = "add"
  ): void {
    // If edit mode and initial state is empty, override form and default data
    if (!Object.keys(this.formValues).length && process === "edit") {
      this.formValues = { ...(data as T) };
      this.defaultData = { ...(data as T) };
    }

    // Merge partial data into form state
    this.formValues = { ...this.formValues, ...data };

    // Run schema-based validation
    if (validationConfig) {
      switch (validationConfig.type) {
        case "joi": {
          const result = validationConfig.schema.validate(this.formValues);
          this.handleJoiError(result.error as { details?: Array<{ path: Array<string | number>; message: string }> } | undefined);
          break;
        }
        case "zod": {
          const result = validationConfig.schema.safeParse(this.formValues);
          if (!result.success && result.error) this.handleZodError(result.error);
          else this.errors = {};
          break;
        }
        case "yup": {
          try {
            validationConfig.schema.validateSync(this.formValues, { abortEarly: false });
            this.errors = {};
          } catch (err: any) {
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
              if (error) this.errors[key] = error;
              else delete this.errors[key];
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

  clearFormValues(): void {
    this.formValues = {} as T;
    this.defaultData = {} as T;
    this.errors = {};
    this.isValid = false;
    this.notify();
  }

  unsubscribeFromStore(): void {
    this.clearFormValues();
    this.subscribers.clear();
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

  getSubscribersCount(): number {
    return this.subscribers.size;
  }

  private handleJoiError(error?: { details?: Array<{ path: Array<string | number>; message: string }> }): void {
    this.errors = {};
    if (error?.details) {
      for (const d of error.details) {
        if (d.path && d.message) {
          this.errors[d.path.join(".")] = d.message;
        }
      }
    }
  }

  private handleZodError(error: any): void {
    this.errors = {};
    for (const issue of error.issues) {
      this.errors[issue.path.join(".")] = issue.message;
    }
  }

  private handleYupError(error: any): void {
    this.errors = {};
    if (error.inner) {
      for (const err of error.inner) {
        this.errors[err.path] = err.message;
      }
    } else if (error.path && error.message) {
      this.errors[error.path] = error.message;
    }
  }
  private handleGenericValidationError(errorMap: Record<string, { message: string }>): void {
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
