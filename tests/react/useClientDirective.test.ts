import { readFileSync } from "node:fs";

// Guards the README's React Server Components claim: every module that uses a
// React hook must start with "use client" so importing the React-free
// createFormStore does not pull hooks into a server component's module graph.
describe('"use client" directive', () => {
    const clientModules = [
        "src/react/useForm.ts",
        "src/react/useFormStore.ts",
        "src/react/useFormStoreState.ts",
    ];

    it.each(clientModules)('%s starts with "use client"', (path) => {
        const source = readFileSync(path, "utf8");
        expect(source.startsWith('"use client";')).toBe(true);
    });

    it("src/core/store.ts stays free of the directive, so it can be used from a server component", () => {
        const source = readFileSync("src/core/store.ts", "utf8");
        expect(source.startsWith('"use client"')).toBe(false);
    });
});
