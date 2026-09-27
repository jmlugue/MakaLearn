// Loads a TypeScript source file for the logic tests: transpiles it and answers its imports, either from
// `modules` (for "@/..." paths) or by loading relative files the same way. No database, no bundler.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const cache = new Map();

export function loadTs(file, modules = {}) {
  const resolved = path.resolve(file);
  if (cache.has(resolved)) return cache.get(resolved);
  const compiled = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const exports = {};
  cache.set(resolved, exports);
  const requireStub = (name) => {
    if (name in modules) return modules[name];
    if (name.startsWith(".")) {
      const base = path.resolve(path.dirname(resolved), name);
      const target = [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find((candidate) => fs.existsSync(candidate));
      if (target) return loadTs(target, modules);
    }
    if (name.startsWith("@/")) {
      const base = path.resolve("src", name.slice(2));
      const target = [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find((candidate) => fs.existsSync(candidate));
      if (target) return loadTs(target, modules);
    }
    throw new Error(`Unexpected import in ${file}: ${name}`);
  };
  new Function("exports", "require", compiled)(exports, requireStub);
  return exports;
}
