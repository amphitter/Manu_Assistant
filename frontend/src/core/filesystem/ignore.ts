export const IGNORE_FOLDERS = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  ".turbo",
  ".idea",
  ".vscode",

  // Docs
  "docs",
  "documentation",

  // Coverage
  "coverage",

  // Cache
  ".cache",
  ".output",

  // Package managers
  ".pnpm-store",
  ".yarn",
]);

export const IGNORE_FILES = new Set([
  ".DS_Store",
  "Thumbs.db",

  // Documentation
  "README.md",
  "AGENTS-PROJECT.md",
  "CHANGELOG.md",
  "LICENSE",

  // Lock files
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",

  // Environment
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
]);