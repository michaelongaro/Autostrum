// Check the emitted server import graph, including empty imports preserved by
// verbatimModuleSyntax. Run: node scripts/verifyServerModuleBoundaries.mjs
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(root, "src");
const config = ts.readConfigFile(
  resolve(root, "tsconfig.json"),
  ts.sys.readFile,
);
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const visited = new Set();

function check(file, chain = []) {
  if (visited.has(file)) return;
  const path = relative(root, file).replaceAll("\\", "/");
  assert(
    !path.startsWith("src/stores/"),
    `Server runtime imports a client store:\n${[...chain, path].join(" -> ")}`,
  );
  visited.add(file);
  const source = readFileSync(file, "utf8");
  // Server pages may render Client Components, whose dependencies stay client-side.
  if (/^\s*["']use client["'];?/.test(source)) return;

  const { outputText } = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: {
      ...options,
      jsx: ts.JsxEmit.Preserve,
      verbatimModuleSyntax: true,
    },
  });
  const emitted = ts.createSourceFile(
    file,
    outputText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  function visit(node) {
    const specifier =
      ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
        ? node.moduleSpecifier
        : ts.isCallExpression(node) &&
            node.expression.kind === ts.SyntaxKind.ImportKeyword
          ? node.arguments[0]
          : undefined;
    if (specifier && ts.isStringLiteral(specifier)) {
      const dependency = ts.resolveModuleName(
        specifier.text,
        file,
        options,
        ts.sys,
      ).resolvedModule;
      if (
        dependency &&
        !dependency.isExternalLibraryImport &&
        resolve(dependency.resolvedFileName).startsWith(sourceRoot)
      ) {
        check(resolve(dependency.resolvedFileName), [...chain, path]);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(emitted);
}

function checkRoutes(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) checkRoutes(file);
    else if (/^(page|layout|route)\.tsx?$/.test(entry.name)) check(file);
  }
}

checkRoutes(resolve(sourceRoot, "app"));
console.log(
  `PASS: ${visited.size} server modules and client boundaries checked; no runtime store imports.`,
);
