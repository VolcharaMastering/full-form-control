import { describe, expect, it } from "@jest/globals";

import {
    createFormStore,
    FormStore,
    type FormStoreState,
    type IFormStore,
    type TouchedFormStoreState,
    useForm,
    useFormStore,
    useFormStoreState,
    type ValidationConfig,
} from "#src/index.js";

interface SignupForm {
    email: string;
    age: number;
}

interface UploadForm {
    attachments: File[];
    birthday: Date;
}

const initialValues: SignupForm = { email: "", age: 18 };

// Compiled by typecheck; hooks and invalid calls are not executed.
export const useInterfaceFormChecks = () => {
    const store = createFormStore<SignupForm>(initialValues);
    const legacyStore: IFormStore<SignupForm> = store;
    const local: TouchedFormStoreState<SignupForm> = useForm<SignupForm>(initialValues);
    const shared: TouchedFormStoreState<SignupForm> = useFormStore(store);
    const state: TouchedFormStoreState<SignupForm> = useFormStoreState(store);
    const legacy: FormStoreState<SignupForm> = useFormStore(legacyStore);
    const legacyState: FormStoreState<SignupForm> = useFormStoreState(legacyStore);

    // @ts-expect-error age must remain a number
    store.setFormValues({ age: "18" });
    // @ts-expect-error unknown fields are rejected in object literals
    local.setFormValues({ unknownField: true });
    const invalidConfig: ValidationConfig<SignupForm> = {
        type: "field",
        schema: {
            // @ts-expect-error field validators must accept the declared field type
            age: (value: string) => value,
        },
    };
    // @ts-expect-error primitives cannot be form models
    createFormStore<string>();
    // @ts-expect-error primitives cannot be form models
    new FormStore<number>();
    // @ts-expect-error primitives cannot be form models
    useForm<boolean>();
    // @ts-expect-error arrays cannot be root form models
    createFormStore<string[]>();
    // @ts-expect-error inferred arrays cannot be root form values
    createFormStore(["email"]);
    // @ts-expect-error readonly tuples cannot be root form values
    createFormStore(["email"] as const);
    // @ts-expect-error dates cannot be root form models
    new FormStore<Date>();
    // @ts-expect-error inferred dates cannot be root form values
    new FormStore(new Date());
    // @ts-expect-error functions cannot be root form models
    useForm<() => void>();
    // @ts-expect-error inferred functions cannot be root form values
    useForm(() => ({}));
    // @ts-expect-error maps cannot be root form values
    createFormStore(new Map<string, string>());
    // @ts-expect-error sets cannot be root form models
    createFormStore<Set<string>>();
    // @ts-expect-error promises cannot be root form values
    createFormStore(Promise.resolve({ email: "" }));
    // @ts-expect-error regular expressions cannot be root form values
    createFormStore(/email/);
    // @ts-expect-error errors cannot be root form values
    createFormStore(new Error("error"));
    // @ts-expect-error typed arrays cannot be root form values
    createFormStore(new Uint8Array(2));
    // @ts-expect-error unions containing unsupported roots are rejected
    createFormStore<SignupForm | Date>();

    const inferred = createFormStore(initialValues);
    // @ts-expect-error inferred models retain their field types
    inferred.setFormValues({ age: "18" });

    const upload = useForm<UploadForm>({ attachments: [], birthday: new Date() });

    return { local, shared, state, legacy, legacyState, invalidConfig, upload };
};

describe("interface form models", () => {
    it("preserves model inference and field validator types", () => {
        const store = createFormStore(initialValues);
        const classStore = new FormStore<SignupForm>(initialValues);

        store.setFormValues(
            { email: "user@example.com", age: 17 },
            {
                type: "field",
                schema: {
                    email: (value) => (value.includes("@") ? null : "Invalid email"),
                    age: (value) => (value >= 18 ? null : "Too young"),
                },
            }
        );

        expect(store.getErrors()).toEqual({ age: "Too young" });
        store.setFormValues({ age: 21 });
        expect(store.isFormValid()).toBe(true);
        expect(classStore.getFormValues()).toEqual(initialValues);
    });
});
