const objectConstructor = Function.prototype.toString.call(Object);

export const assertFormValues = (value: unknown, name: string): void => {
    if (typeof value === "object" && value !== null) {
        const prototype: object | null = Object.getPrototypeOf(value);
        if (prototype === null) return;

        // Accept plain objects from other browser windows or JavaScript contexts.
        const constructor: unknown = Object.getOwnPropertyDescriptor(
            prototype,
            "constructor"
        )?.value;
        if (
            Object.getPrototypeOf(prototype) === null &&
            typeof constructor === "function" &&
            Function.prototype.toString.call(constructor) === objectConstructor
        ) {
            return;
        }
    }

    throw new TypeError(
        `FormStore: ${name} must be a plain object with form fields. Wrap arrays, dates, files, and other values in named fields.`
    );
};
