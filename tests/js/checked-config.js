// @ts-check
// Guards the README claim: a JavaScript file with // @ts-check flags a wrong
// validation type the same way a TypeScript file does.
import { createFormStore, zod } from "../../src/index.js";

const schema = {
    safeParse: () => ({ success: /** @type {const} */ (true) }),
};

const store = createFormStore({ email: "" });
store.setFormValues({ email: "ok@example.com" }, zod(schema));

store.setFormValues(
    { email: "bad" },
    // @ts-expect-error "zodd" is not a valid validation type
    { type: "zodd", schema }
);
