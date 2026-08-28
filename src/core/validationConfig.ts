import type {
    CustomSchema,
    FieldValidationSchema,
    JoiSchema,
    ValidationConfig,
    YupSchema,
    ZodSchema,
} from "./types.js";

// Named helpers so a typo is a missing-name error in JavaScript (ESLint
// no-undef), not a free-form string like { type: "zodd" }.

export const joi = <T>(schema: JoiSchema<T>): Extract<ValidationConfig<T>, { type: "joi" }> => ({
    type: "joi",
    schema,
});

export const zod = <T>(schema: ZodSchema<T>): Extract<ValidationConfig<T>, { type: "zod" }> => ({
    type: "zod",
    schema,
});

export const yup = <T>(schema: YupSchema<T>): Extract<ValidationConfig<T>, { type: "yup" }> => ({
    type: "yup",
    schema,
});

export const custom = <T>(
    schema: CustomSchema<T>
): Extract<ValidationConfig<T>, { type: "custom" }> => ({
    type: "custom",
    schema,
});

export const field = <T>(
    schema: FieldValidationSchema<T>
): Extract<ValidationConfig<T>, { type: "field" }> => ({
    type: "field",
    schema,
});

// Not released yet. Uncomment when the adapter is ready:
// export const valibot = <T>(schema: CustomSchema<T>): Extract<ValidationConfig<T>, { type: "valibot" }> => ({
//     type: "valibot",
//     schema,
// });
// export const superstruct = <T>(schema: CustomSchema<T>): Extract<ValidationConfig<T>, { type: "superstruct" }> => ({
//     type: "superstruct",
//     schema,
// });
// export const typia = <T>(schema: CustomSchema<T>): Extract<ValidationConfig<T>, { type: "typia" }> => ({
//     type: "typia",
//     schema,
// });
// export const ajv = <T>(schema: CustomSchema<T>): Extract<ValidationConfig<T>, { type: "ajv" }> => ({
//     type: "ajv",
//     schema,
// });
// export const vest = <T>(schema: CustomSchema<T>): Extract<ValidationConfig<T>, { type: "vest" }> => ({
//     type: "vest",
//     schema,
// });
