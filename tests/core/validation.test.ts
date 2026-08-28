import { describe, expect, it } from "@jest/globals";
import { createFormStore } from "../../src/index.js";

type SignupForm = { username: string; email: string };

describe("Joi validation", () => {
    // Mirrors the README's Joi example, without depending on the joi package itself.
    const joiLikeSchema = {
        validate: (
            data: SignupForm,
            options?: { abortEarly?: boolean }
        ): { error?: { details?: { path: string[]; message: string }[] } } => {
            const details: { path: string[]; message: string }[] = [];
            if (!data.username || data.username.length < 3) {
                details.push({
                    path: ["username"],
                    message: '"username" length must be at least 3',
                });
            }
            if (!data.email || !data.email.includes("@")) {
                details.push({ path: ["email"], message: '"email" must be a valid email' });
            }
            if (details.length === 0) return { error: undefined };
            // Confirms the store always requests every error, not just the first one.
            if (options?.abortEarly) return { error: { details: details.slice(0, 1) } };
            return { error: { details } };
        },
    };

    it("fills errors from every invalid field, calling validate with abortEarly: false", () => {
        const store = createFormStore<SignupForm>({ username: "", email: "" });
        store.setFormValues({ username: "ab" }, { type: "joi", schema: joiLikeSchema });

        expect(store.getErrors()).toEqual({
            username: '"username" length must be at least 3',
            email: '"email" must be a valid email',
        });
        expect(store.isFormValid()).toBe(false);
    });

    it("clears errors once the schema reports no problems", () => {
        const store = createFormStore<SignupForm>({ username: "", email: "" });
        store.setFormValues({ username: "ab" }, { type: "joi", schema: joiLikeSchema });
        store.setFormValues(
            { username: "ann", email: "ann@example.com" },
            { type: "joi", schema: joiLikeSchema }
        );

        expect(store.getErrors()).toEqual({});
        expect(store.isFormValid()).toBe(true);
    });
});

describe("Zod validation", () => {
    // Mirrors the README's Zod example shape (safeParse / issues / PropertyKey[] path).
    const zodLikeSchema = {
        safeParse: (data: SignupForm) => {
            const issues: { path: PropertyKey[]; message: string }[] = [];
            if (data.username.length < 3)
                issues.push({ path: ["username"], message: "Must be 3+ chars" });
            if (!data.email.includes("@"))
                issues.push({ path: ["email"], message: "Invalid email" });
            if (issues.length > 0) return { success: false as const, error: { issues } };
            return { success: true as const };
        },
    };

    it("reports every invalid field", () => {
        const store = createFormStore<SignupForm>({ username: "", email: "foo" });
        store.setFormValues({ email: "foo" }, { type: "zod", schema: zodLikeSchema });

        expect(store.getErrors()).toEqual({
            username: "Must be 3+ chars",
            email: "Invalid email",
        });
    });

    it("joins numeric and string path segments with a dot", () => {
        type NestedForm = { addresses: { city: string }[] };
        const schema = {
            safeParse: (_data: NestedForm) => ({
                success: false as const,
                error: { issues: [{ path: ["addresses", 0, "city"], message: "Required" }] },
            }),
        };
        const store = createFormStore<NestedForm>({ addresses: [{ city: "" }] });
        store.setFormValues({}, { type: "zod", schema });

        expect(store.getErrors()).toEqual({ "addresses.0.city": "Required" });
    });
});

describe("Yup validation", () => {
    // Mirrors the README's Yup example: validateSync throws a ValidationError-shaped object.
    const yupLikeSchema = {
        validateSync: (data: SignupForm, options?: { abortEarly?: boolean }) => {
            const inner: { path: string; message: string }[] = [];
            if (!data.username || data.username.length < 3) {
                inner.push({ path: "username", message: "Too short" });
            }
            if (!data.email || !data.email.includes("@")) {
                inner.push({ path: "email", message: "Invalid email" });
            }
            if (inner.length === 0) return;
            if (options?.abortEarly) throw { inner: [inner[0]] };
            throw { inner };
        },
    };

    it("reports every invalid field when the schema throws a ValidationError-like object", () => {
        const store = createFormStore<SignupForm>({ username: "john", email: "" });
        store.setFormValues({ username: "john" }, { type: "yup", schema: yupLikeSchema });

        expect(store.getErrors()).toEqual({ email: "Invalid email" });
    });

    it("clears errors once validation passes", () => {
        const store = createFormStore<SignupForm>({ username: "", email: "" });
        store.setFormValues({ username: "j" }, { type: "yup", schema: yupLikeSchema });
        expect(store.getErrors()).not.toEqual({});

        store.setFormValues(
            { username: "john", email: "john@example.com" },
            { type: "yup", schema: yupLikeSchema }
        );
        expect(store.getErrors()).toEqual({});
    });

    it("rethrows a genuine schema bug instead of reporting the form as valid", () => {
        // A broken schema throwing a plain TypeError, not a ValidationError-shaped
        // object. Every other adapter already lets this kind of exception reach
        // the caller instead of quietly treating it as "no errors", so a bug in
        // the schema crashes loudly rather than turning isValid true by accident.
        const brokenSchema = {
            validateSync: () => {
                throw new TypeError("schema bug");
            },
        };
        const store = createFormStore<SignupForm>({ username: "", email: "" });

        expect(() =>
            store.setFormValues({ username: "john" }, { type: "yup", schema: brokenSchema })
        ).toThrow(TypeError);
    });
});

describe("Custom / generic validation", () => {
    // Mirrors the README's "Custom" example: a validate(data) returning Record<string, {message}>.
    const customSchema = {
        validate(data: SignupForm) {
            const errors: Record<string, { message: string }> = {};
            if (!data.email?.includes("@")) {
                errors.email = { message: "Invalid email" };
            }
            return errors;
        },
    };

    it("extracts .message from each entry in the returned error map", () => {
        const store = createFormStore<SignupForm>({ username: "", email: "" });
        store.setFormValues({ email: "foo" }, { type: "custom", schema: customSchema });

        expect(store.getErrors()).toEqual({ email: "Invalid email" });
    });

    it("clears errors once the schema returns an empty map", () => {
        const store = createFormStore<SignupForm>({ username: "", email: "" });
        store.setFormValues({ email: "foo" }, { type: "custom", schema: customSchema });
        store.setFormValues({ email: "foo@example.com" }, { type: "custom", schema: customSchema });

        expect(store.getErrors()).toEqual({});
    });
});

describe("Per-field validation", () => {
    const fieldSchema = {
        type: "field" as const,
        schema: {
            email: (v: string) => (/.+@.+/.test(v) ? null : "Invalid email"),
            username: (v: string) => (v.length >= 3 ? null : "Too short"),
        },
    };

    it("only re-validates fields present in the current call", () => {
        const store = createFormStore<SignupForm>({ username: "", email: "" });
        store.setFormValues({ email: "foo" }, fieldSchema);

        expect(store.getErrors()).toEqual({ email: "Invalid email" });
    });

    it("leaves errors for untouched fields alone on a later call", () => {
        const store = createFormStore<SignupForm>({ username: "", email: "" });
        store.setFormValues({ email: "foo", username: "ab" }, fieldSchema);
        expect(store.getErrors()).toEqual({ email: "Invalid email", username: "Too short" });

        store.setFormValues({ email: "ok@example.com" }, fieldSchema);
        // Only "email" was in this call's partial, so "username"'s stale error must remain.
        expect(store.getErrors()).toEqual({ username: "Too short" });
    });

    it("removes a field's error once that field becomes valid", () => {
        const store = createFormStore<SignupForm>({ username: "", email: "" });
        store.setFormValues({ email: "foo" }, fieldSchema);
        store.setFormValues({ email: "ok@example.com" }, fieldSchema);

        expect(store.getErrors()).toEqual({});
    });
});

describe("Config reuse across calls", () => {
    it("reuses the last config on a call that omits it, so errors stay in sync with formValues", () => {
        const schema = {
            validate: (data: SignupForm) => {
                const errors: Record<string, { message: string }> = {};
                if (!data.email.includes("@")) errors.email = { message: "Invalid email" };
                return errors;
            },
        };
        const store = createFormStore<SignupForm>({ username: "", email: "" });

        store.setFormValues({ email: "bad" }, { type: "custom", schema });
        expect(store.getErrors()).toEqual({ email: "Invalid email" });

        // No config passed this time; the last one must be reused automatically.
        store.setFormValues({ email: "fixed@example.com" });
        expect(store.getErrors()).toEqual({});
    });

    it("does not validate at all if a config was never provided", () => {
        const store = createFormStore<SignupForm>({ username: "", email: "" });
        store.setFormValues({ email: "not-an-email" });
        expect(store.getErrors()).toEqual({});
        expect(store.isFormValid()).toBe(true);
    });
});

describe("Unknown validation type", () => {
    it("throws on a mistyped tag instead of reporting the form as valid", () => {
        const store = createFormStore<SignupForm>({ username: "", email: "" });

        expect(() =>
            store.setFormValues({ email: "bad" }, {
                type: "zodd",
                schema: { safeParse: () => ({ success: true as const }) },
            } as never)
        ).toThrow('FormStore: unknown validation type "zodd"');

        // The broken config must not be remembered for later config-less calls.
        store.setFormValues({ email: "still-bad" });
        expect(store.getErrors()).toEqual({});
    });

    it("throws on an unreleased tag instead of treating it as custom", () => {
        const store = createFormStore<SignupForm>({ username: "", email: "" });

        expect(() =>
            store.setFormValues({ email: "bad" }, {
                type: "valibot",
                schema: { validate: () => ({}) },
            } as never)
        ).toThrow('FormStore: unknown validation type "valibot"');
    });
});
