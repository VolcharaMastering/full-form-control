import { useSyncExternalStore } from "react";
import { FormStore } from "../core/store";
// Create a new instance of FormStore with a generic type
const store = new FormStore();
// Hook to use form store
export function useFormStore() {
    // Subscribe to form values changes and get the current form values
    const formValues = useSyncExternalStore((cb) => store.subscribe(cb), () => store.getFormValues());
    // Subscribe to errors changes and get the current errors
    const errors = useSyncExternalStore((cb) => store.subscribe(cb), () => store.getErrors());
    // Subscribe to validity changes and get the current validity status
    const isValid = useSyncExternalStore((cb) => store.subscribe(cb), () => store.isFormValid());
    // Return the form values, errors, validity status, and methods to set and clear form values
    return {
        formValues,
        errors,
        isValid,
        setFormValues: store.setFormValues,
        clearFormValues: () => store.clearFormValues(),
    };
}
