import { useSyncExternalStore } from "react";

import { FormStore } from "../core/store";

// Hook to subscribe to a specific FormStore instance.
// The store must be created once per form via createFormStore.
// Multiple components can call useFormStore with the same store to share state.
export const useFormStore = <T extends Record<string, unknown>>(
    store: FormStore<T>
) => {
    // One subscription to a single snapshot { formValues, errors, isValid }.
    // The store caches this object and replaces it on every state change,
    // so notify() triggers at most one re-render per component.
    // The third argument is getServerSnapshot for SSR and React Server Components.
    // It returns the same cached reference, which stays stable until a mutation,
    // so hydration matches without warnings.
    const snapshot = useSyncExternalStore(
        (cb) => store.subscribe(cb),
        () => store.getSnapshot(),
        () => store.getSnapshot()
    );

    // Return current state and bound action methods for the given store.
    return {
        formValues: snapshot.formValues,
        errors: snapshot.errors,
        isValid: snapshot.isValid,
        setFormValues: store.setFormValues,
        clearFormValues: () => store.clearFormValues(),
        destroy: () => store.destroy(),
        /** @deprecated Use destroy() instead. */
        unsubscribeFromStore: () => store.destroy(),
    };
};
