import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ChangeEvent } from "react";

import {
    createFormStore,
    useFormStore,
    type FormSnapshot,
    type IFormStore,
} from "../../src/index.js";

type SignupForm = { username: string; email: string };

// Typed against IFormStore, not the concrete FormStore class, so both a real
// createFormStore instance and a hand-rolled test double can use these components.
// Mirrors the README "Quick start / Multiple forms on one page" example.
const FormFields = ({ store }: { store: IFormStore<SignupForm> }) => {
    const { formValues, errors, isValid, setFormValues } = useFormStore(store);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormValues({ [name]: value });
    };

    return (
        <form>
            <label htmlFor="username">Username</label>
            <input
                id="username"
                name="username"
                value={formValues.username ?? ""}
                onChange={handleChange}
            />
            {errors.username && <span>{errors.username}</span>}
            <button type="submit" disabled={!isValid}>
                Sign up
            </button>
        </form>
    );
};

// A second, independent component reading the same store, showing the shared value read-only.
const StatusBadge = ({ store }: { store: IFormStore<SignupForm> }) => {
    const { formValues } = useFormStore(store);
    return <p>Current username: {formValues.username || "(empty)"}</p>;
};

describe("useFormStore with a shared createFormStore instance", () => {
    it("lets two independent components read and write the same store", async () => {
        const signupStore = createFormStore<SignupForm>({ username: "", email: "" });
        const user = userEvent.setup();

        render(
            <>
                <FormFields store={signupStore} />
                <StatusBadge store={signupStore} />
            </>
        );

        expect(screen.getByText("Current username: (empty)")).toBeDefined();

        await user.type(screen.getByLabelText("Username"), "ann");

        expect((screen.getByLabelText("Username") as HTMLInputElement).value).toBe("ann");
        // The second, unrelated component must see the update from the first one.
        expect(screen.getByText("Current username: ann")).toBeDefined();
    });

    it("keeps working with the same store instance across separate render trees", () => {
        const signupStore = createFormStore<SignupForm>({ username: "", email: "" });

        const { unmount } = render(<StatusBadge store={signupStore} />);
        expect(screen.getByText("Current username: (empty)")).toBeDefined();
        unmount();

        signupStore.setFormValues({ username: "bob" });
        render(<StatusBadge store={signupStore} />);
        expect(screen.getByText("Current username: bob")).toBeDefined();
    });
});

// A minimal hand-rolled implementation, not created via createFormStore, to prove
// useFormStore accepts anything shaped like IFormStore<T>, as advertised in the
// README's "Fully typed public API" section, and is not secretly tied to the
// concrete FormStore class.
class FakeFormStore<T extends Record<string, unknown>> implements IFormStore<T> {
    formValues: T;
    defaultData: T;
    errors: Record<string, string> = {};
    isValid = true;
    private listeners = new Set<() => void>();
    // useSyncExternalStore requires getSnapshot to return the same reference
    // until something actually changes, so the snapshot is cached here too,
    // same as the real FormStore does.
    private cachedSnapshot: FormSnapshot<T>;

    constructor(initialValues: T) {
        this.formValues = initialValues;
        this.defaultData = initialValues;
        this.cachedSnapshot = {
            formValues: this.formValues,
            errors: this.errors,
            isValid: this.isValid,
        };
    }

    private notify(): void {
        this.cachedSnapshot = {
            formValues: this.formValues,
            errors: this.errors,
            isValid: this.isValid,
        };
        this.listeners.forEach((listener) => listener());
    }

    setFormValues = (data: Partial<T>): void => {
        this.formValues = { ...this.formValues, ...data };
        this.notify();
    };
    clearFormValues = (): void => {
        this.formValues = this.defaultData;
        this.notify();
    };
    destroy = (): void => this.listeners.clear();
    unsubscribeFromStore = this.destroy;

    getFormValues = (): T => this.formValues;
    getDefaultData = (): T => this.defaultData;
    getErrors = (): Record<string, string> => this.errors;
    isFormValid = (): boolean => this.isValid;
    getSnapshot = (): FormSnapshot<T> => this.cachedSnapshot;

    subscribe = (callback: () => void): (() => void) => {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    };
    getSubscribersCount = (): number => this.listeners.size;
}

describe("useFormStore with a custom IFormStore implementation", () => {
    it("reads and writes through a hand-rolled store, not just a real FormStore", async () => {
        const fakeStore = new FakeFormStore<SignupForm>({ username: "", email: "" });
        const user = userEvent.setup();

        render(<FormFields store={fakeStore} />);

        await user.type(screen.getByLabelText("Username"), "ann");

        expect((screen.getByLabelText("Username") as HTMLInputElement).value).toBe("ann");
        expect(fakeStore.getFormValues().username).toBe("ann");
    });
});
