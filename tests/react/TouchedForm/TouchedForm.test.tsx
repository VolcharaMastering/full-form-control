import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";

import { createFormStore, type FormStore,useForm, useFormStore } from "#src/index.js";

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

const TouchedForm = () => {
    const { formValues, displayErrors, markFieldTouched, setFormValues } = useForm<FormValues>({
        username: "",
        email: "",
    });

    return (
        <form>
            <label htmlFor="username">Username</label>
            <input
                id="username"
                value={formValues.username}
                onChange={(event) => setFormValues({ username: event.target.value }, validation)}
                onBlur={() => markFieldTouched("username", validation)}
            />
            {displayErrors.username && <span>{displayErrors.username}</span>}

            <label htmlFor="email">Email</label>
            <input
                id="email"
                value={formValues.email}
                onChange={(event) => setFormValues({ email: event.target.value }, validation)}
                onBlur={() => markFieldTouched("email", validation)}
            />
            {displayErrors.email && <span>{displayErrors.email}</span>}
        </form>
    );
};

const SharedTouchedForm = ({ store }: { store: FormStore<FormValues> }) => {
    const { displayErrors, markFieldTouched } = useFormStore(store);

    return (
        <button onClick={() => markFieldTouched("username", validation)}>
            {displayErrors.username ?? "Check username"}
        </button>
    );
};

describe("touched field errors in useForm", () => {
    it("shows a required error after leaving an empty field", async () => {
        const user = userEvent.setup();
        render(<TouchedForm />);

        await user.click(screen.getByLabelText("Username"));
        await user.tab();

        expect(screen.getByText("Too short")).toBeDefined();
        expect(screen.queryByText("Invalid email")).toBeNull();
    });

    it("shows a field error after blur and hides it after the value is fixed", async () => {
        const user = userEvent.setup();
        render(<TouchedForm />);

        await user.type(screen.getByLabelText("Username"), "a");
        expect(screen.queryByText("Too short")).toBeNull();
        expect(screen.queryByText("Invalid email")).toBeNull();

        await user.tab();
        expect(screen.getByText("Too short")).toBeDefined();
        expect(screen.queryByText("Invalid email")).toBeNull();

        await user.type(screen.getByLabelText("Username"), "nna");
        expect(screen.queryByText("Too short")).toBeNull();
    });
});

describe("touched field errors in useFormStore", () => {
    it("exposes the touched field API for a shared store", async () => {
        const user = userEvent.setup();
        const store = createFormStore<FormValues>({ username: "", email: "" });
        render(<SharedTouchedForm store={store} />);

        await user.click(screen.getByRole("button", { name: "Check username" }));

        expect(screen.getByRole("button", { name: "Too short" })).toBeDefined();
        expect(store.getErrors()).toEqual({ username: "Too short", email: "Invalid email" });
    });
});
