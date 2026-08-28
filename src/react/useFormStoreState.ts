"use client";

import { useSyncExternalStore } from "react";

import type { FormSnapshot, IFormStore } from "../core/types.js";

// Snapshot plus stable action methods returned to components.
// Shared return shape for useFormStore (multi-form) and useForm (standalone).
export type FormStoreState<T extends Record<string, unknown>> = FormSnapshot<T> & {
    setFormValues: IFormStore<T>["setFormValues"];
    clearFormValues: IFormStore<T>["clearFormValues"];
    destroy: IFormStore<T>["destroy"];
    /** @deprecated Use destroy() instead. */
    unsubscribeFromStore: IFormStore<T>["unsubscribeFromStore"];
};

// Shared subscription logic for any store implementing IFormStore, not just
// instances created by createFormStore, so a hand-rolled or test-double store
// works here too, as long as it satisfies the interface.
// Both public hooks call this internally, so the useSyncExternalStore setup
// and the returned action methods stay identical between them.
export const useFormStoreState = <T extends Record<string, unknown>>(
    store: IFormStore<T>
): FormStoreState<T> => {
    // One subscription to a single snapshot { formValues, errors, isValid }.
    // The store caches this object and replaces it on every state change,
    // so notify() triggers at most one re-render per component.
    // store.subscribe and store.getSnapshot are stable arrow properties on
    // the store instance, so they are passed directly instead of wrapped in
    // new arrow functions on every render. useSyncExternalStore compares
    // these by reference, and a fresh wrapper each render would tear down
    // and re-establish the subscription on every render instead of once.
    // The third argument is getServerSnapshot for SSR and React Server Components.
    // It returns the same cached reference, which stays stable until a mutation,
    // so hydration matches without warnings.
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

    // setFormValues, clearFormValues, destroy and unsubscribeFromStore are
    // stable arrow properties on the store too, so they are returned as-is
    // instead of wrapped in new arrow functions on every render.
    return {
        formValues: snapshot.formValues,
        errors: snapshot.errors,
        isValid: snapshot.isValid,
        setFormValues: store.setFormValues,
        clearFormValues: store.clearFormValues,
        destroy: store.destroy,
        unsubscribeFromStore: store.unsubscribeFromStore,
    };
};
