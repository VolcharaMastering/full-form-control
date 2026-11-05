"use client";

import type { IFormStore, ITouchedFormStore } from "../core/types.js";
import {
    useFormStoreState,
    type FormStoreState,
    type TouchedFormStoreState,
} from "./useFormStoreState.js";

// Hook for multiple forms on one page.
// The store must be created once per form via createFormStore, then passed
// to useFormStore in every component that needs to read or write that form.
// Several components can share the same form by calling useFormStore with
// the same store instance. Accepts anything implementing IFormStore<T>, not
// just instances returned by createFormStore.
export function useFormStore<T extends object>(
    store: ITouchedFormStore<T>
): TouchedFormStoreState<T>;
export function useFormStore<T extends object>(store: IFormStore<T>): FormStoreState<T>;
export function useFormStore<T extends object>(store: IFormStore<T>): FormStoreState<T> {
    return useFormStoreState(store);
}
