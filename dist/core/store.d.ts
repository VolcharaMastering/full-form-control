export declare class FormStore<T extends Record<string, any>> implements IFormStore<T> {
    formValues: T;
    defaultData: T;
    errors: Record<string, string>;
    isValid: boolean;
    private subscribers;
    setFormValues: (data: Partial<T>, schema?: ValidationSchema<T>, process?: "add" | "edit") => void;
    constructor(initialValues?: {
        [K in keyof T]: T[K];
    });
    subscribe(callback: () => void): () => void;
    private notify;
    private _setFormValues;
    clearFormValues(): void;
    unsubscribeFromStore(): void;
    getFormValues(): T;
    getDefaultData(): T;
    getErrors(): Record<string, string>;
    isFormValid(): boolean;
    getSubscribersCount(): number;
    private handleValidationError;
    private handleValidationResult;
}
