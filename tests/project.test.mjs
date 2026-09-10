import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test("manifest is valid for a new community plugin", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  assert.equal(manifest.id, "yue-douyin-knowledge");
  assert.match(manifest.id, /^[a-z-]+$/);
  assert.equal(manifest.id.includes("obsidian"), false);
  assert.equal(manifest.id.endsWith("plugin"), false);
  assert.equal(manifest.version, "1.0.0");
  assert.equal(manifest.isDesktopOnly, true);
  assert.ok(manifest.description.length <= 250);
  assert.ok(manifest.description.endsWith("."));
});

test("release files and independent implementation record exist", () => {
  for (const relative of [
    "README.md",
    "LICENSE",
    "manifest.json",
    "styles.css",
    "main.js",
    "docs/PRODUCT_SPEC.md",
    "docs/LEGACY_BASELINE.md",
  ]) {
    assert.equal(fs.existsSync(path.join(root, relative)), true, relative);
  }
});

test("share parser keeps unique Douyin links and enforces the batch limit", () => {
  const filename = path.join(root, "src", "utils.ts");
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2018,
    },
  }).outputText;
  const localModule = { exports: {} };
  new Function("module", "exports", output)(localModule, localModule.exports);
  const { parseShareInputs, safePathSegment } = localModule.exports;
  const repeated = Array.from(
    { length: 12 },
    (_, index) => `https://v.douyin.com/item${index}/`
  ).join("\n");
  const links = parseShareInputs(`${repeated}\nhttps://example.com/no`, 10);
  assert.equal(links.length, 10);
  assert.equal(new Set(links).size, 10);
  assert.equal(
    parseShareInputs("https://v.douyin.com/abc/ https://v.douyin.com/abc/").length,
    1
  );
  assert.equal(safePathSegment('a:b*c?d"e', "fallback"), "a b c d e");
});

test("new source does not import the legacy plugin", () => {
  const source = fs
    .readdirSync(path.join(root, "src"))
    .filter((name) => name.endsWith(".ts"))
    .map((name) => fs.readFileSync(path.join(root, "src", name), "utf8"))
    .join("\n");
  assert.equal(source.includes("douyin-capture"), false);
  assert.equal(source.includes("lyxdream"), false);
  assert.equal(source.includes("out_dir"), false);
});

