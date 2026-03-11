#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_EXTENSIONS = new Set(['.html', '.css', '.js', '.json']);
const NO_SPACE_BEFORE = new Set([')', ']', '}', ',', ';', ':', '.', '?', '++', '--']);
const NO_SPACE_AFTER = new Set(['(', '[', '{', ',', ';', ':', '.', '!', '~', '++', '--']);
const KEYWORDS = new Set([
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'finally',
  'for',
  'from',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'let',
  'new',
  'of',
  'return',
  'switch',
  'throw',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'yield',
]);

function walk(targetPath, files = []) {
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
      walk(path.join(targetPath, entry.name), files);
    }
    return files;
  }

  if (DEFAULT_EXTENSIONS.has(path.extname(targetPath).toLowerCase())) {
    files.push(targetPath);
  }
  return files;
}

function minifyJson(input) {
  return JSON.stringify(JSON.parse(input));
}

function minifyCss(input) {
  let out = '';
  let i = 0;
  let quote = null;
  let inComment = false;
  let pendingSpace = false;

  while (i < input.length) {
    const char = input[i];
    const next = input[i + 1];

    if (inComment) {
      if (char === '*' && next === '/') {
        inComment = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (quote) {
      out += char;
      if (char === '\\') {
        out += next || '';
        i += 2;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      i += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inComment = true;
      i += 2;
      continue;
    }

    if (char === '"' || char === "'") {
      if (pendingSpace && out && !/[{:;,>+~(]/.test(out[out.length - 1])) {
        out += ' ';
      }
      pendingSpace = false;
      quote = char;
      out += char;
      i += 1;
      continue;
    }

    if (/\s/.test(char)) {
      pendingSpace = true;
      i += 1;
      continue;
    }

    if (pendingSpace) {
      const prev = out[out.length - 1];
      if (prev && /[a-zA-Z0-9_%#.)'"]/.test(prev) && /[a-zA-Z0-9_#.]/.test(char)) {
        out += ' ';
      }
      pendingSpace = false;
    }

    if (/^[{}:;,>+~()[\]]$/.test(char)) {
      out = out.replace(/\s+$/, '');
    }

    out += char;
    i += 1;
  }

  return out.trim();
}

function tokenizeJs(input) {
  const tokens = [];
  let i = 0;
  let prevToken = null;

  const push = (type, value) => {
    const token = { type, value };
    tokens.push(token);
    if (type !== 'space') {
      prevToken = token;
    }
  };

  const isRegexAllowed = () => {
    if (!prevToken) {
      return true;
    }
    if (prevToken.type === 'punct') {
      return /^[([{:;,!?=+\-*%^&|<>]$/.test(prevToken.value);
    }
    if (prevToken.type === 'keyword') {
      return /^(return|throw|case|delete|void|typeof|instanceof|in|of|new|do|else)$/.test(
        prevToken.value
      );
    }
    return false;
  };

  while (i < input.length) {
    const char = input[i];
    const next = input[i + 1];

    if (/\s/.test(char)) {
      while (i < input.length && /\s/.test(input[i])) {
        i += 1;
      }
      push('space', ' ');
      continue;
    }

    if (char === '/' && next === '/') {
      i += 2;
      while (i < input.length && input[i] !== '\n') {
        i += 1;
      }
      push('space', ' ');
      continue;
    }

    if (char === '/' && next === '*') {
      i += 2;
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) {
        i += 1;
      }
      i += 2;
      push('space', ' ');
      continue;
    }

    if (char === "'" || char === '"') {
      let value = char;
      i += 1;
      while (i < input.length) {
        const current = input[i];
        value += current;
        if (current === '\\') {
          value += input[i + 1] || '';
          i += 2;
          continue;
        }
        i += 1;
        if (current === char) {
          break;
        }
      }
      push('string', value);
      continue;
    }

    if (char === '`') {
      let value = char;
      i += 1;
      while (i < input.length) {
        const current = input[i];
        value += current;
        if (current === '\\') {
          value += input[i + 1] || '';
          i += 2;
          continue;
        }
        i += 1;
        if (current === '`') {
          break;
        }
      }
      push('template', value);
      continue;
    }

    if (char === '/' && isRegexAllowed()) {
      let value = char;
      i += 1;
      let inClass = false;
      while (i < input.length) {
        const current = input[i];
        value += current;
        if (current === '\\') {
          value += input[i + 1] || '';
          i += 2;
          continue;
        }
        if (current === '[') {
          inClass = true;
        } else if (current === ']') {
          inClass = false;
        } else if (current === '/' && !inClass) {
          i += 1;
          while (/[a-z]/i.test(input[i] || '')) {
            value += input[i];
            i += 1;
          }
          break;
        }
        i += 1;
      }
      push('regex', value);
      continue;
    }

    if (/[A-Za-z_$]/.test(char)) {
      let value = char;
      i += 1;
      while (/[A-Za-z0-9_$]/.test(input[i] || '')) {
        value += input[i];
        i += 1;
      }
      push(KEYWORDS.has(value) ? 'keyword' : 'word', value);
      continue;
    }

    if (/[0-9]/.test(char)) {
      let value = char;
      i += 1;
      while (/[0-9a-fA-F_xX.eE]/.test(input[i] || '')) {
        value += input[i];
        i += 1;
      }
      push('number', value);
      continue;
    }

    const threeChar = input.slice(i, i + 3);
    const twoChar = input.slice(i, i + 2);
    const punct =
      ['===', '!==', '>>>', '<<=', '>>=', '&&=', '||=', '??='].includes(threeChar)
        ? threeChar
        : [
            '=>',
            '==',
            '!=',
            '>=',
            '<=',
            '++',
            '--',
            '&&',
            '||',
            '??',
            '+=',
            '-=',
            '*=',
            '/=',
            '%=',
            '&=',
            '|=',
            '^=',
            '?.',
            '<<',
            '>>',
            '**',
          ].includes(twoChar)
        ? twoChar
        : char;

    push('punct', punct);
    i += punct.length;
  }

  return tokens.filter((token) => token.type !== 'space');
}

function needsSpace(prev, next) {
  if (!prev || !next) {
    return false;
  }

  if (
    ['word', 'keyword', 'number'].includes(prev.type) &&
    ['word', 'keyword', 'number'].includes(next.type)
  ) {
    return true;
  }

  if (
    ['regex', 'string', 'template'].includes(prev.type) &&
    ['word', 'keyword', 'number'].includes(next.type)
  ) {
    return true;
  }

  if (
    ['word', 'keyword', 'number'].includes(prev.type) &&
    ['regex', 'string', 'template'].includes(next.type)
  ) {
    return true;
  }

  if (prev.type === 'punct' && NO_SPACE_AFTER.has(prev.value)) {
    return false;
  }

  if (next.type === 'punct' && NO_SPACE_BEFORE.has(next.value)) {
    return false;
  }

  return false;
}

function minifyJs(input) {
  const tokens = tokenizeJs(input);
  let out = '';

  for (let i = 0; i < tokens.length; i += 1) {
    const prev = tokens[i - 1];
    const current = tokens[i];
    if (needsSpace(prev, current)) {
      out += ' ';
    }
    out += current.value;
  }

  return out.trim();
}

function minifyHtml(input) {
  let output = input.replace(/<!--[\s\S]*?-->/g, '');

  output = output.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (match, css) =>
    match.replace(css, minifyCss(css))
  );

  output = output.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, js) => {
    if (/\bsrc\s*=/.test(attrs || '')) {
      return match.replace(/\s{2,}/g, ' ');
    }
    return `<script${attrs}>${minifyJs(js)}</script>`;
  });

  output = output.replace(/>\s+</g, '><');
  output = output.replace(/\s{2,}/g, ' ');
  output = output.replace(/\s*\n\s*/g, '');

  return output.trim();
}

function minifyByExtension(filePath, input) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.json':
      return minifyJson(input);
    case '.css':
      return minifyCss(input);
    case '.js':
      return minifyJs(input);
    case '.html':
      return minifyHtml(input);
    default:
      return input;
  }
}

function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? args : ['public'];
  const files = targets.flatMap((target) => walk(path.resolve(process.cwd(), target)));

  if (files.length === 0) {
    console.error('No matching files found.');
    process.exitCode = 1;
    return;
  }

  for (const file of files) {
    const original = fs.readFileSync(file, 'utf8');
    const minified = minifyByExtension(file, original);
    if (minified !== original) {
      fs.writeFileSync(file, minified, 'utf8');
    }
  }

  process.stdout.write(`${files.length} file(s) minified.\n`);
}

module.exports = {
  DEFAULT_EXTENSIONS,
  minifyByExtension,
  minifyCss,
  minifyHtml,
  minifyJs,
  minifyJson,
  walk,
};

if (require.main === module) {
  main();
}
