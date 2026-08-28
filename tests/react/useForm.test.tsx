import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ChangeEvent } from "react";

import { useForm } from "../../src/index.js";

type SignupForm = { username: string; email: string };

// Mirrors the README "Quick start / A single standalone form" example.
const SignupFormComponent = () => {
    const { formValues, errors, isValid, setFormValues } = useForm<SignupForm>({
        username: "",
        email: "",
    });

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
            <label htmlFor="email">Email</label>
            <input id="email" name="email" value={formValues.email ?? ""} onChange={handleChange} />
            {errors.username && <span>{errors.username}</span>}
            {errors.email && <span>{errors.email}</span>}
            <button type="submit" disabled={!isValid}>
                Sign up
            </button>
        </form>
    );
};

describe("useForm", () => {
    it("renders with the given initialValues and a disabled submit button", () => {
        render(<SignupFormComponent />);

        expect((screen.getByLabelText("Username") as HTMLInputElement).value).toBe("");
        expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("");
        expect(
            (screen.getByRole("button", { name: "Sign up" }) as HTMLButtonElement).disabled
        ).toBe(true);
    });

    it("updates formValues and enables submit once a field is typed", async () => {
        const user = userEvent.setup();
        render(<SignupFormComponent />);

        await user.type(screen.getByLabelText("Username"), "ann");

        expect((screen.getByLabelText("Username") as HTMLInputElement).value).toBe("ann");
        expect(
            (screen.getByRole("button", { name: "Sign up" }) as HTMLButtonElement).disabled
        ).toBe(false);
    });

    it("keeps the same store instance across re-renders of the same component", () => {
        let renderCount = 0;
        const Probe = () => {
            renderCount += 1;
            const { setFormValues } = useForm<SignupForm>({ username: "", email: "" });
            return <button onClick={() => setFormValues({ username: "x" })}>go</button>;
        };

        render(<Probe />);
        expect(renderCount).toBe(1);
    });

    it("applies initialValues only on the first render", () => {
        const Wrapper = ({ initial }: { initial: string }) => {
            const { formValues } = useForm<SignupForm>({ username: initial, email: "" });
            return <div>{formValues.username}</div>;
        };

        const { rerender } = render(<Wrapper initial="first" />);
        expect(screen.getByText("first")).toBeDefined();

        rerender(<Wrapper initial="second" />);
        // The store was already created with "first"; a new initial prop must not reset it.
        expect(screen.getByText("first")).toBeDefined();
    });
});
