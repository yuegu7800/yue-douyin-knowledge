import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceDirectory = path.join(root, "src");
const outputFile = path.join(root, "main.js");

const sourceFiles = fs
  .readdirSync(sourceDirectory)
  .filter((name) => name.endsWith(".ts"))
  .sort();

const modules = [];
for (const filename of sourceFiles) {
  const fullPath = path.join(sourceDirectory, filename);
  const source = fs.readFileSync(fullPath, "utf8");
  const result = ts.transpileModule(source, {
    fileName: fullPath,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2018,
      esModuleInterop: true,
      importHelpers: false,
      sourceMap: false,
    },
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );
  if (errors.length > 0) {
    throw new Error(
      errors
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
        .join("\n")
    );
  }
  const id = `./${filename.replace(/\.ts$/, "")}`;
  modules.push(
    `${JSON.stringify(id)}: function(module, exports, require) {\n${result.outputText}\n}`
  );
}

const bundle = `"use strict";
const __nativeRequire = require;
const __modules = {
${modules.join(",\n")}
};
const __cache = Object.create(null);
function __normalize(request) {
  return request.replace(/\\\\/g, "/").replace(/\\.js$/, "");
}
function __load(id) {
  const normalized = __normalize(id);
  if (__cache[normalized]) return __cache[normalized].exports;
  const factory = __modules[normalized];
  if (!factory) return __nativeRequire(id);
  const localModule = { exports: {} };
  __cache[normalized] = localModule;
  factory(localModule, localModule.exports, (request) => {
    if (!request.startsWith(".")) return __nativeRequire(request);
    return __load(__normalize(request));
  });
  return localModule.exports;
}
module.exports = __load("./main");
`;

fs.writeFileSync(outputFile, bundle, "utf8");
console.log(`Built ${path.relative(root, outputFile)} from ${sourceFiles.length} modules.`);
