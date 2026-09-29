"use client";

import type { IFormStore } from "../core/types.js";
import { useFormStoreState, type FormStoreState } from "./useFormStoreState.js";

// Hook for multiple forms on one page.
// The store must be created once per form via createFormStore, then passed
// to useFormStore in every component that needs to read or write that form.
// Several components can share the same form by calling useFormStore with
// the same store instance. Accepts anything implementing IFormStore<T>, not
// just instances returned by createFormStore.
export const useFormStore = <T extends Record<string, unknown>>(
    store: IFormStore<T>
): FormStoreState<T> => useFormStoreState(store);
