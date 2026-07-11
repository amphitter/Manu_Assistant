const fs = require("fs");
const path = require("path");

// Since export.js is in the project root
const ROOT = path.join(__dirname, "src");
const OUTPUT = path.join(__dirname, "AGENTS-PROJECT.md");

const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  ".turbo",
]);

const VALID_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
  ".md",
]);

let output = "# AGENTS PROJECT EXPORT\n\n";

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!VALID_EXTENSIONS.has(path.extname(entry.name))) continue;

    const relative = path.relative(ROOT, fullPath);

    output += `\n\n=====================================================\n`;
    output += `FILE: ${relative}\n`;
    output += `=====================================================\n\n`;

    output += "```" + path.extname(entry.name).substring(1) + "\n";
    output += fs.readFileSync(fullPath, "utf8");
    output += "\n```\n";
  }
}

walk(ROOT);

fs.writeFileSync(OUTPUT, output);

console.log("\n✅ Export Complete!");
console.log(OUTPUT);