export default {
  input: {
    index: "dist/index.js",
    "react/useForm": "dist/react/useForm.js",
    "react/useFormStore": "dist/react/useFormStore.js",
    "react/useFormStoreState": "dist/react/useFormStoreState.js",
  },
  external: (id) => id === "react" || id.startsWith("react/"),
  preserveEntrySignatures: "strict",
  onwarn: (warning, warn) => {
    if (warning.code === "MODULE_LEVEL_DIRECTIVE" && warning.message.includes("use client")) return;
    warn(warning);
  },
  output: {
    dir: "dist/bundle",
    format: "es",
    preserveModules: true,
    preserveModulesRoot: "dist",
    sourcemap: true,
    banner: (chunk) => chunk.facadeModuleId?.replaceAll("\\", "/").includes("/dist/react/") ? '"use client";' : "",
  },
};
