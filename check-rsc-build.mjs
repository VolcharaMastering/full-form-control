import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";

const readOutput = (path) => readFile(new URL(`./dist/bundle/${path}`, import.meta.url), "utf8");

const index = await readOutput("index.js");
const core = await readOutput("core/store.js");
assert.doesNotMatch(index, /^\s*["']use client["']/);
assert.doesNotMatch(core, /^\s*["']use client["']/);
assert.match(index, /from ['"]\.\/core\/store\.js['"]/);

for (const name of ["useForm", "useFormStore", "useFormStoreState"]) {
  const output = await readOutput(`react/${name}.js`);
  assert.match(output, /^\s*["']use client["'];/);
  assert.match(index, new RegExp(`from ['"]\\./react/${name}\\.js['"]`));
}

const hooks = await readOutput("react/useFormStoreState.js");
assert.match(hooks, /from ['"]react['"]/);

const { createFormStore } = await import("./dist/bundle/index.js");
assert.equal(typeof createFormStore({}).getSnapshot, "function");
