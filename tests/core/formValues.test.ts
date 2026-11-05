import { runInNewContext } from "node:vm";

import { describe, expect, it, jest } from "@jest/globals";

import { createFormStore, FormStore } from "#src/index.js";

class FormModel {
    email = "";
}

const invalidRoots: Array<[string, unknown]> = [
    ["null", null],
    ["string", "email"],
    ["number", 1],
    ["boolean", false],
    ["array", []],
    ["function", () => ({})],
    ["class constructor", FormModel],
    ["class instance", new FormModel()],
    ["date", new Date()],
    ["map", new Map()],
    ["set", new Set()],
    ["regular expression", /email/],
    ["error", new Error("error")],
    ["promise", Promise.resolve({})],
    ["array buffer", new ArrayBuffer(2)],
    ["typed array", new Uint8Array(2)],
    ["file", new File(["text"], "file.txt")],
    ["custom prototype", Object.create({ email: "" })],
];

describe("form root values", () => {
    it.each(invalidRoots)("rejects %s during construction", (_name, value) => {
        expect(() => createFormStore(value as never)).toThrow(TypeError);
        expect(() => new FormStore(value as never)).toThrow("initialValues must be a plain object");
    });

    it.each([...invalidRoots, ["undefined", undefined] as [string, unknown]])(
        "rejects %s updates before changing state or running validation",
        (_name, value) => {
            const store = createFormStore({ email: "first@example.com" });
            store.setFormValues({});
            const snapshot = store.getSnapshot();
            const defaults = store.getDefaultData();
            const validate = jest.fn(() => ({}));
            const listener = jest.fn();
            store.subscribe(listener);

            expect(() =>
                store.setFormValues(
                    value as never,
                    { type: "custom", schema: { validate } },
                    "edit"
                )
            ).toThrow("setFormValues data must be a plain object");

            expect(store.getSnapshot()).toBe(snapshot);
            expect(store.getFormValues()).toBe(snapshot.formValues);
            expect(store.getDefaultData()).toBe(defaults);
            expect(store.isFormValid()).toBe(true);
            expect(validate).not.toHaveBeenCalled();
            expect(listener).not.toHaveBeenCalled();
        }
    );

    it("accepts omitted initial values and empty updates", () => {
        const store = createFormStore();
        store.setFormValues({});
        expect(store.getFormValues()).toEqual({});
        expect(createFormStore(undefined).getFormValues()).toEqual({});
    });

    it("accepts null-prototype roots and updates", () => {
        const initial: { email?: string } = Object.create(null);
        initial.email = "first@example.com";
        const store = createFormStore(initial);
        const update: { email?: string } = Object.create(null);
        update.email = "next@example.com";

        store.setFormValues(update);
        expect(store.getFormValues()).toEqual({ email: "next@example.com" });
    });

    it("accepts plain objects from another JavaScript context", () => {
        const initial: unknown = runInNewContext('({ email: "first@example.com" })');
        const update: unknown = runInNewContext('({ email: "next@example.com" })');
        const store = createFormStore(initial as { email: string });

        store.setFormValues(update as { email: string });
        expect(store.getFormValues()).toEqual({ email: "next@example.com" });
    });

    it("preserves arrays, dates, files, and class instances inside fields", () => {
        const values = {
            choices: ["first"],
            birthday: new Date(),
            attachment: new File(["text"], "file.txt"),
            profile: new FormModel(),
        };
        const store = createFormStore(values);
        const nextChoices = ["second"];

        store.setFormValues({ choices: nextChoices });
        expect(store.getFormValues().choices).toBe(nextChoices);
        expect(store.getFormValues().birthday).toBe(values.birthday);
        expect(store.getFormValues().attachment).toBe(values.attachment);
        expect(store.getFormValues().profile).toBe(values.profile);
    });
});
