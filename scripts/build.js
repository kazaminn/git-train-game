#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { minifyByExtension, walk } = require('./minify');

const SRC_DIR = path.resolve(process.cwd(), 'src');
const DIST_DIR = path.resolve(process.cwd(), 'docs');
const MINIFY_EXTENSIONS = new Set(['.js', '.css', '.json']);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyBuiltFile(sourcePath) {
  const relativePath = path.relative(SRC_DIR, sourcePath);
  const destinationPath = path.join(DIST_DIR, relativePath);
  const destinationDir = path.dirname(destinationPath);
  const extension = path.extname(sourcePath).toLowerCase();
  const original = fs.readFileSync(sourcePath, 'utf8');

  ensureDir(destinationDir);

  if (relativePath === 'index.html') {
    const previous = fs.existsSync(destinationPath)
      ? fs.readFileSync(destinationPath, 'utf8')
      : null;
    if (previous !== original) {
      fs.writeFileSync(destinationPath, original, 'utf8');
      return { destinationPath, changed: true };
    }
    return { destinationPath, changed: false };
  }

  const output = MINIFY_EXTENSIONS.has(extension)
    ? minifyByExtension(sourcePath, original)
    : original;

  const previous = fs.existsSync(destinationPath)
    ? fs.readFileSync(destinationPath, 'utf8')
    : null;

  if (previous !== output) {
    fs.writeFileSync(destinationPath, output, 'utf8');
    return { destinationPath, changed: true };
  }

  return { destinationPath, changed: false };
}

function removeStaleFiles(validDestinations) {
  if (!fs.existsSync(DIST_DIR)) {
    return [];
  }

  const staleFiles = walk(DIST_DIR).filter((filePath) => !validDestinations.has(filePath));
  for (const filePath of staleFiles) {
    fs.rmSync(filePath, { force: true });
  }
  return staleFiles;
}

function build() {
  ensureDir(DIST_DIR);

  const sourceFiles = walk(SRC_DIR).sort();
  const builtFiles = sourceFiles.map(copyBuiltFile);
  const validDestinations = new Set(builtFiles.map((result) => result.destinationPath));
  const staleFiles = removeStaleFiles(validDestinations);
  const changedFiles = builtFiles.filter((result) => result.changed);

  process.stdout.write(
    `${changedFiles.length} file(s) updated, ${staleFiles.length} file(s) removed in ${path.basename(
      DIST_DIR
    )}.\n`
  );
}

build();
