import { describe, expect, it, jest } from "@jest/globals";

import { createFormStore, FormStore } from "../../src/index.js";

type SignupForm = { username: string; email: string };

describe("createFormStore / initial state", () => {
    it("starts with empty formValues and errors when no initialValues are given", () => {
        const store = createFormStore<SignupForm>();
        expect(store.getFormValues()).toEqual({});
        expect(store.getErrors()).toEqual({});
    });

    it("copies initialValues into formValues and defaultData", () => {
        const initialValues: SignupForm = { username: "ann", email: "ann@example.com" };
        const store = createFormStore(initialValues);
        expect(store.getFormValues()).toEqual(initialValues);
        expect(store.getDefaultData()).toEqual(initialValues);
        // Mutating the input object afterward must not affect the store.
        initialValues.username = "changed";
        expect(store.getFormValues().username).toBe("ann");
    });

    it("isValid is false right after creation, even with non-empty initialValues", () => {
        const store = createFormStore<SignupForm>({ username: "ann", email: "ann@example.com" });
        expect(store.isFormValid()).toBe(false);
    });
});

describe('setFormValues in "add" mode', () => {
    it("merges partial data into the current values", () => {
        const store = createFormStore<SignupForm>({ username: "", email: "" });
        store.setFormValues({ username: "ann" });
        expect(store.getFormValues()).toEqual({ username: "ann", email: "" });
        store.setFormValues({ email: "ann@example.com" });
        expect(store.getFormValues()).toEqual({ username: "ann", email: "ann@example.com" });
    });

    it("becomes valid once errors are empty and at least one field is set", () => {
        const store = createFormStore<SignupForm>();
        store.setFormValues({ username: "ann" });
        expect(store.isFormValid()).toBe(true);
    });

    it('defaults to "add" when no process argument is passed', () => {
        const store = createFormStore<SignupForm>({ username: "ann", email: "a@b.c" });
        store.setFormValues({ username: "bob" });
        // "add" mode never captures a defaultData baseline.
        expect(store.getDefaultData()).toEqual({ username: "ann", email: "a@b.c" });
    });
});

describe('setFormValues in "edit" mode', () => {
    it("captures defaultData as a baseline on the first edit call", () => {
        const store = createFormStore<SignupForm>({ username: "", email: "" });
        store.setFormValues({ username: "ann", email: "ann@example.com" }, undefined, "edit");
        expect(store.getDefaultData()).toEqual({ username: "ann", email: "ann@example.com" });
    });

    it("keeps isValid false until a field changes compared to defaultData", () => {
        const store = createFormStore<SignupForm>({ username: "ann", email: "ann@example.com" });
        store.setFormValues({}, undefined, "edit");
        expect(store.isFormValid()).toBe(false);

        store.setFormValues({ username: "bob" }, undefined, "edit");
        expect(store.isFormValid()).toBe(true);
    });

    it("captures the baseline only once, keeping earlier add-mode input instead of overwriting it", () => {
        const store = createFormStore<SignupForm>({ username: "", email: "" });
        store.setFormValues({ username: "ann" });
        store.setFormValues({ email: "ann@example.com" }, undefined, "edit");
        // The baseline must include the "add"-mode username entered before the edit call.
        expect(store.getDefaultData()).toEqual({ username: "ann", email: "ann@example.com" });

        store.setFormValues({ email: "someone-else@example.com" }, undefined, "edit");
        // A later edit call must not recapture the baseline.
        expect(store.getDefaultData()).toEqual({ username: "ann", email: "ann@example.com" });
    });

    it("keeps comparing against defaultData on later add-mode calls too, once edit mode has been used", () => {
        const store = createFormStore<SignupForm>({ username: "ann", email: "ann@example.com" });
        store.setFormValues({}, undefined, "edit");
        store.setFormValues({ username: "ann" }); // "add" call, value unchanged
        expect(store.isFormValid()).toBe(false);

        store.setFormValues({ username: "bob" }); // "add" call, but a real change
        expect(store.isFormValid()).toBe(true);
    });

    it("clearFormValues resets edit mode back to plain add semantics", () => {
        const store = createFormStore<SignupForm>({ username: "ann", email: "ann@example.com" });
        store.setFormValues({}, undefined, "edit");
        store.clearFormValues();
        store.setFormValues({ username: "bob" });
        expect(store.isFormValid()).toBe(true);
    });
});

describe("clearFormValues", () => {
    it("restores initialValues, not an empty object, and resets defaultData and errors", () => {
        const initialValues: SignupForm = { username: "ann", email: "ann@example.com" };
        const store = createFormStore<SignupForm>(initialValues);
        store.setFormValues(
            { username: "a" },
            { type: "field", schema: { username: (v) => (v.length >= 3 ? null : "too short") } }
        );
        expect(store.getErrors()).not.toEqual({});

        store.clearFormValues();
        expect(store.getFormValues()).toEqual(initialValues);
        expect(store.getDefaultData()).toEqual(initialValues);
        expect(store.getErrors()).toEqual({});
        expect(store.isFormValid()).toBe(false);
    });

    it("restores an empty object when the store was created without initialValues", () => {
        const store = createFormStore<SignupForm>();
        store.setFormValues({ username: "ann" });

        store.clearFormValues();
        expect(store.getFormValues()).toEqual({});
        expect(store.getDefaultData()).toEqual({});
    });

    it("is unaffected by later mutations of the initialValues object passed in", () => {
        const initialValues: SignupForm = { username: "ann", email: "ann@example.com" };
        const store = createFormStore<SignupForm>(initialValues);
        store.setFormValues({ username: "bob" });
        initialValues.username = "mutated-after-construction";

        store.clearFormValues();
        expect(store.getFormValues()).toEqual({ username: "ann", email: "ann@example.com" });
    });

    it("keeps existing subscribers and notifies them", () => {
        const store = createFormStore<SignupForm>({ username: "ann", email: "" });
        const listener = jest.fn();
        store.subscribe(listener);

        store.clearFormValues();

        expect(listener).toHaveBeenCalledTimes(1);
        expect(store.getSubscribersCount()).toBe(1);
    });

    it("forgets the remembered validation config", () => {
        const store = createFormStore<SignupForm>({ username: "", email: "" });
        store.setFormValues(
            { username: "a" },
            { type: "field", schema: { username: (v) => (v.length >= 3 ? null : "too short") } }
        );
        store.clearFormValues();

        // A config-less call after clearFormValues must not re-run the old field validator.
        store.setFormValues({ username: "a" });
        expect(store.getErrors()).toEqual({});
    });
});

describe("subscribe / notify", () => {
    it("notifies subscribers on every setFormValues call", () => {
        const store = createFormStore<SignupForm>();
        const listener = jest.fn();
        store.subscribe(listener);

        store.setFormValues({ username: "ann" });
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it("stops notifying a listener after it unsubscribes", () => {
        const store = createFormStore<SignupForm>();
        const listener = jest.fn();
        const unsubscribe = store.subscribe(listener);

        unsubscribe();
        store.setFormValues({ username: "ann" });

        expect(listener).not.toHaveBeenCalled();
        expect(store.getSubscribersCount()).toBe(0);
    });

    it("supports several independent subscribers", () => {
        const store = createFormStore<SignupForm>();
        const first = jest.fn();
        const second = jest.fn();
        store.subscribe(first);
        store.subscribe(second);

        store.setFormValues({ username: "ann" });

        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1);
        expect(store.getSubscribersCount()).toBe(2);
    });
});

describe("getSnapshot", () => {
    it("returns the same reference when nothing changed", () => {
        const store = createFormStore<SignupForm>({ username: "ann", email: "" });
        const first = store.getSnapshot();
        const second = store.getSnapshot();
        expect(first).toBe(second);
    });

    it("returns a new reference after a mutation", () => {
        const store = createFormStore<SignupForm>({ username: "", email: "" });
        const before = store.getSnapshot();
        store.setFormValues({ username: "ann" });
        const after = store.getSnapshot();

        expect(after).not.toBe(before);
        expect(after.formValues).toEqual({ username: "ann", email: "" });
    });

    it("subscribe and getSnapshot are stable references across calls", () => {
        const store = createFormStore<SignupForm>();
        expect(store.subscribe).toBe(store.subscribe);
        expect(store.getSnapshot).toBe(store.getSnapshot);
        expect(store.setFormValues).toBe(store.setFormValues);
        expect(store.clearFormValues).toBe(store.clearFormValues);
        expect(store.destroy).toBe(store.destroy);
    });
});

describe("destroy", () => {
    it("clears data and removes every subscriber", () => {
        const store = createFormStore<SignupForm>({ username: "ann", email: "" });
        const listener = jest.fn();
        store.subscribe(listener);

        store.destroy();

        expect(store.getFormValues()).toEqual({});
        expect(store.getSubscribersCount()).toBe(0);
    });

    it("does not notify subscribers", () => {
        const store = createFormStore<SignupForm>({ username: "ann", email: "" });
        const listener = jest.fn();
        store.subscribe(listener);

        store.destroy();

        expect(listener).not.toHaveBeenCalled();
    });

    it("is idempotent: calling it more than once does not throw", () => {
        const store = createFormStore<SignupForm>();
        store.destroy();
        expect(() => store.destroy()).not.toThrow();
    });

    it("makes setFormValues throw afterward", () => {
        const store = createFormStore<SignupForm>();
        store.destroy();
        expect(() => store.setFormValues({ username: "ann" })).toThrow();
    });

    it("makes clearFormValues throw afterward", () => {
        const store = createFormStore<SignupForm>();
        store.destroy();
        expect(() => store.clearFormValues()).toThrow();
    });

    it("makes subscribe a safe no-op afterward instead of throwing", () => {
        const store = createFormStore<SignupForm>();
        store.destroy();

        const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
        const listener = jest.fn();
        let unsubscribe: () => void = () => {};
        expect(() => {
            unsubscribe = store.subscribe(listener);
        }).not.toThrow();
        expect(store.getSubscribersCount()).toBe(0);
        expect(warnSpy).toHaveBeenCalled();

        unsubscribe();
        warnSpy.mockRestore();
    });

    it("unsubscribeFromStore is a deprecated alias of destroy", () => {
        const store = createFormStore<SignupForm>();
        store.unsubscribeFromStore();
        expect(() => store.setFormValues({ username: "ann" })).toThrow();
    });
});

describe("FormStore class export", () => {
    it("createFormStore returns a real FormStore instance", () => {
        const store = createFormStore<SignupForm>();
        expect(store).toBeInstanceOf(FormStore);
    });
});
