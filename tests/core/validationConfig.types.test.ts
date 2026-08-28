import { custom, field, joi, yup, zod, type ValidationConfig, type ValidationType } from "../../src/index.js";

type SignupForm = { email: string };

// Compile-time contract: after install, TypeScript and the editor flag any
// tag that is not one of the released ValidationType literals.
describe("ValidationType / ValidationConfig", () => {
    it("accepts each released config", () => {
        const joi: ValidationConfig<SignupForm> = {
            type: "joi",
            schema: { validate: () => ({}) },
        };
        const zod: ValidationConfig<SignupForm> = {
            type: "zod",
            schema: { safeParse: () => ({ success: true as const }) },
        };
        const yup: ValidationConfig<SignupForm> = {
            type: "yup",
            schema: { validateSync: () => undefined },
        };
        const custom: ValidationConfig<SignupForm> = {
            type: "custom",
            schema: { validate: () => ({}) },
        };
        const field: ValidationConfig<SignupForm> = {
            type: "field",
            schema: { email: (value) => (value.includes("@") ? null : "Invalid email") },
        };

        const tags: ValidationType[] = [joi.type, zod.type, yup.type, custom.type, field.type];
        expect(tags).toEqual(["joi", "zod", "yup", "custom", "field"]);
    });

    it("rejects unreleased and unknown tags at compile time", () => {
        // @ts-expect-error valibot is not a released validation type
        const valibot: ValidationType = "valibot";
        // @ts-expect-error superstruct is not a released validation type
        const superstruct: ValidationType = "superstruct";
        // @ts-expect-error typia is not a released validation type
        const typia: ValidationType = "typia";
        // @ts-expect-error ajv is not a released validation type
        const ajv: ValidationType = "ajv";
        // @ts-expect-error vest is not a released validation type
        const vest: ValidationType = "vest";
        // @ts-expect-error unknown tag is not a validation type
        const unknown: ValidationType = "zodd";

        expect([valibot, superstruct, typia, ajv, vest, unknown]).toHaveLength(6);
    });
});

describe("validation config helpers", () => {
    it("builds a typed config for each released tag", () => {
        const schema = { validate: () => ({}) };
        expect(joi(schema)).toEqual({ type: "joi", schema });
        expect(zod({ safeParse: () => ({ success: true as const }) }).type).toBe("zod");
        expect(yup({ validateSync: () => undefined }).type).toBe("yup");
        expect(custom(schema)).toEqual({ type: "custom", schema });
        expect(field({ email: () => null }).type).toBe("field");
    });
});
