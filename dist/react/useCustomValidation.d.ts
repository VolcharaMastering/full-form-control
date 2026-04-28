import { FormStore } from "../core/store";
export declare const useFormStore: <T extends Record<string, unknown>>(store: FormStore<T>) => {
    formValues: T;
    errors: Record<string, string>;
    isValid: boolean;
    setFormValues: (data: Partial<T>, schema?: import("../core/types").ValidationConfig<T> | undefined, process?: "add" | "edit") => void;
    clearFormValues: () => void;
    destroy: () => void;
    /** @deprecated Use destroy() instead. */
    unsubscribeFromStore: () => void;
};
