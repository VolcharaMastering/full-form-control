import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { StrictMode, useEffect, useRef } from "react";

import { createFormStore, useForm, useFormStore, type FormStore } from "../../src/index.js";

type LoginForm = { login: string };

// Mirrors the README "Disposing a store" guidance: useForm's own store never
// needs manual disposal, and it keeps working normally under StrictMode.
describe("useForm under StrictMode", () => {
    it("keeps working normally after StrictMode's extra mount/cleanup/mount cycle", async () => {
        const user = userEvent.setup();

        const Form = () => {
            const { formValues, setFormValues } = useForm<LoginForm>({ login: "" });
            return (
                <input
                    aria-label="login"
                    value={formValues.login ?? ""}
                    onChange={(e) => setFormValues({ login: e.target.value })}
                />
            );
        };

        render(
            <StrictMode>
                <Form />
            </StrictMode>
        );

        await user.type(screen.getByLabelText("login"), "ann");
        expect((screen.getByLabelText("login") as HTMLInputElement).value).toBe("ann");
    });
});

// Mirrors the README "Disposing a store" warning: pairing destroy() with a bare
// mount/unmount effect on a component that keeps using that same store is unsafe
// under StrictMode in development, because destroy() is irreversible.
describe("destroy() paired with a mount/unmount effect, per the README warning", () => {
    it("breaks the store under StrictMode, as documented", () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

        let capturedStore: FormStore<LoginForm> | null = null;

        const Form = () => {
            const storeRef = useRef<FormStore<LoginForm> | null>(null);
            if (!storeRef.current) {
                storeRef.current = createFormStore<LoginForm>({ login: "" });
            }
            capturedStore = storeRef.current;

            // This is the exact anti-pattern the README tells readers not to use.
            useEffect(() => {
                const store = storeRef.current;
                return () => {
                    store?.destroy();
                };
            }, []);

            useFormStore(storeRef.current);
            return null;
        };

        render(
            <StrictMode>
                <Form />
            </StrictMode>
        );

        expect(capturedStore).not.toBeNull();
        expect(() => capturedStore?.setFormValues({ login: "ann" })).toThrow();

        warnSpy.mockRestore();
    });
});

describe("store owned by a parent component, without an unmount effect", () => {
    it("keeps working under StrictMode when destroy() is never wired to unmount", async () => {
        const user = userEvent.setup();
        const store = createFormStore<LoginForm>({ login: "" });

        const Login = () => {
            const { formValues, setFormValues } = useFormStore(store);
            return (
                <input
                    aria-label="login"
                    value={formValues.login ?? ""}
                    onChange={(e) => setFormValues({ login: e.target.value })}
                />
            );
        };

        render(
            <StrictMode>
                <Login />
            </StrictMode>
        );

        await user.type(screen.getByLabelText("login"), "bob");
        expect((screen.getByLabelText("login") as HTMLInputElement).value).toBe("bob");
    });
});
