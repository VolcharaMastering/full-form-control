import { useEffect, useReducer, useMemo } from "react";

import { FormStore } from "../core/store";

// One global store for one form
const store = new FormStore<any>();

export function useFormStore<T extends Record<string, any>>() {
    // Counter for forceUpdate
    const [, forceUpdate] = useReducer((c) => c + 1, 0);

    useEffect(() => {
        // Subscribe once
        const unsubscribe = store.subscribe(() => {
            forceUpdate();
        });
        return unsubscribe;
    }, []);
    
    // Return primitives and reference functions
    return {
        formValues: store.getFormValues(),
        defaultData: store.getDefaultData(),
        errors: store.getErrors(),
        isValid: store.isFormValid(),
        setFormValues: store.setFormValues,
        clearFormValues: () => store.clearFormValues(),
    };
}
