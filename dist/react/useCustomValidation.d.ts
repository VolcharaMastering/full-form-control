export declare function useFormStore<T extends Record<string, any>>(): {
    formValues: any;
    errors: Record<string, string>;
    isValid: boolean;
    setFormValues: (data: Partial<any>, schema?: ValidationSchema<any>, process?: "add" | "edit") => void;
    clearFormValues: () => void;
    unsubscribeFromStore: () => void;
};
