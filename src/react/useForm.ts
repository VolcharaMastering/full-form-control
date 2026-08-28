"use client";

import { useRef } from "react";

import { createFormStore, type FormStore } from "../core/store.js";
import { useFormStoreState, type FormStoreState } from "./useFormStoreState.js";

// Hook for a single standalone form.
// Creates and owns its own FormStore internally, so there is no separate
// createFormStore call and no store instance to pass around. Use this when
// a page has just one form. For several forms sharing state across
// components, create a store with createFormStore and use useFormStore instead.
export const useForm = <T extends Record<string, unknown>>(
    initialValues?: T
): FormStoreState<T> => {
    // Lazy init keeps the same store instance for the component lifetime.
    // initialValues only applies on the first render that creates the store.
    const storeRef = useRef<FormStore<T> | null>(null);
    if (!storeRef.current) {
        storeRef.current = createFormStore<T>(initialValues);
    }

    return useFormStoreState(storeRef.current);
};
