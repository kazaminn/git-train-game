#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { minifyByExtension, walk } = require('./minify');

const SRC_DIR = path.resolve(process.cwd(), 'src');
const DIST_DIR = path.resolve(process.cwd(), 'docs');
const MINIFY_EXTENSIONS = new Set(['.js', '.css', '.json']);

function ensureCleanDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyBuiltFile(sourcePath) {
  const relativePath = path.relative(SRC_DIR, sourcePath);
  const destinationPath = path.join(DIST_DIR, relativePath);
  const destinationDir = path.dirname(destinationPath);
  const extension = path.extname(sourcePath).toLowerCase();
  const original = fs.readFileSync(sourcePath, 'utf8');

  fs.mkdirSync(destinationDir, { recursive: true });

  if (relativePath === 'index.html') {
    fs.writeFileSync(destinationPath, original, 'utf8');
    return destinationPath;
  }

  const output = MINIFY_EXTENSIONS.has(extension)
    ? minifyByExtension(sourcePath, original)
    : original;

  fs.writeFileSync(destinationPath, output, 'utf8');
  return destinationPath;
}

function build() {
  ensureCleanDir(DIST_DIR);

  const sourceFiles = walk(SRC_DIR).sort();
  const builtFiles = sourceFiles.map(copyBuiltFile);

  process.stdout.write(`${builtFiles.length} file(s) written to dist.\n`);
}

build();
