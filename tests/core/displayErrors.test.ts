import { describe, expect, it, jest } from "@jest/globals";

import { createFormStore } from "#src/index.js";

type FormValues = { username: string; email: string };

const validation = {
    type: "custom" as const,
    schema: {
        validate: (values: FormValues) => {
            const errors: Record<string, { message: string }> = {};
            if (values.username.length < 3) errors.username = { message: "Too short" };
            if (!values.email.includes("@")) errors.email = { message: "Invalid email" };
            return errors;
        },
    },
};

describe("displayErrors", () => {
    it("remembers a touched field until validation runs", () => {
        const store = createFormStore<FormValues>({ username: "", email: "" });

        store.markFieldTouched("username");
        expect(store.getDisplayErrors()).toEqual({});

        store.setFormValues({ email: "bad" }, validation);
        expect(store.getDisplayErrors()).toEqual({ username: "Too short" });
    });

    it("validates an empty field on blur when a schema is supplied", () => {
        const store = createFormStore<FormValues>({ username: "", email: "" });

        store.markFieldTouched("username", validation);

        expect(store.getErrors()).toEqual({ username: "Too short", email: "Invalid email" });
        expect(store.getDisplayErrors()).toEqual({ username: "Too short" });
        expect(store.isFormValid()).toBe(false);
    });

    it("runs a field validator for an empty touched field", () => {
        const store = createFormStore<FormValues>({ username: "", email: "" });
        const fieldValidation = {
            type: "field" as const,
            schema: { username: (value: string) => (value ? null : "Required") },
        };

        store.markFieldTouched("username", fieldValidation);

        expect(store.getErrors()).toEqual({ username: "Required" });
        expect(store.getDisplayErrors()).toEqual({ username: "Required" });
    });

    it("shows errors only for touched fields while keeping all errors available", () => {
        const store = createFormStore<FormValues>({ username: "", email: "" });
        const listener = jest.fn();
        store.subscribe(listener);

        store.setFormValues({ username: "a" }, validation);
        expect(store.getErrors()).toEqual({ username: "Too short", email: "Invalid email" });
        expect(store.getDisplayErrors()).toEqual({});
        expect(store.isFormValid()).toBe(false);

        store.markFieldTouched("username");
        expect(store.getDisplayErrors()).toEqual({ username: "Too short" });
        expect(store.getSnapshot().displayErrors).toEqual({ username: "Too short" });
        expect(listener).toHaveBeenCalledTimes(2);

        store.markFieldTouched("username");
        expect(listener).toHaveBeenCalledTimes(2);

        store.markFieldTouched("email");
        expect(store.getDisplayErrors()).toEqual({ username: "Too short", email: "Invalid email" });
        expect(store.getErrors()).toEqual({ username: "Too short", email: "Invalid email" });
    });

    it("updates visible errors after validation and clears touched fields on reset", () => {
        const store = createFormStore<FormValues>({ username: "", email: "" });
        store.setFormValues({ username: "a" }, validation);
        store.markFieldTouched("username");

        store.setFormValues({ username: "anna" });
        expect(store.getErrors()).toEqual({ email: "Invalid email" });
        expect(store.getDisplayErrors()).toEqual({});

        store.clearFormValues();
        store.setFormValues({ username: "a" }, validation);
        expect(store.getDisplayErrors()).toEqual({});
        store.markFieldTouched("username");
        expect(store.getDisplayErrors()).toEqual({ username: "Too short" });
    });
});
