import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

test("app instructions and provider prompts avoid semicolons and em dashes", () => {
  const violations = [];
  for (const relative of fs.readdirSync("src", { recursive: true }).filter((file) => /\.tsx?$/.test(file))) {
    const file = path.join("src", relative);
    const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ||
          ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) {
        // Entity terminators such as &amp; are not visible punctuation. Code statements,
        // comments, and punctuation-only tokens are not instructional prose either.
        const text = node.text.replace(/&(?:#\d+|#x[0-9a-f]+|[a-z]+);/gi, "");
        if (/[a-z]/i.test(text) && /\s/.test(text) && /[;\u2014]/.test(text)) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart());
          violations.push(`${file}:${line + 1} ${text.trim().slice(0, 100)}`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual(violations, [], `Use simple sentences in these instructions:\n${violations.join("\n")}`);
});
