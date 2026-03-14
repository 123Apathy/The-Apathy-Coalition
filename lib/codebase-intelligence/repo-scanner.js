import fs from 'fs';
import path from 'path';
import { PROJECT_ROOT } from '../paths.js';

const SKIP_DIRS = new Set([
  '.git',
  '.next',
  'node_modules',
  'logs',
  'memory',
  'data',
]);

const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.json', '.md', '.sh', '.css',
]);

function countLines(content) {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

function countFunctions(content, ext) {
  if (!['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) return 0;

  const patterns = [
    /\bfunction\s+[A-Za-z0-9_$]+\s*\(/g,
    /\b(?:const|let|var)\s+[A-Za-z0-9_$]+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
    /\b(?:const|let|var)\s+[A-Za-z0-9_$]+\s*=\s*(?:async\s*)?[A-Za-z0-9_$]+\s*=>/g,
    /\b[A-Za-z0-9_$]+\s*\([^)]*\)\s*\{/g,
  ];

  const total = patterns.reduce((sum, pattern) => sum + ((content.match(pattern) || []).length), 0);
  return total;
}

function countExports(content, ext) {
  if (!['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) return 0;

  const patterns = [
    /\bexport\s+default\b/g,
    /\bexport\s+(?:async\s+)?function\b/g,
    /\bexport\s+(?:const|let|var|class)\b/g,
    /\bexport\s*\{/g,
    /\bmodule\.exports\b/g,
    /\bexports\.[A-Za-z0-9_$]+\b/g,
  ];

  return patterns.reduce((sum, pattern) => sum + ((content.match(pattern) || []).length), 0);
}

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), results);
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(PROJECT_ROOT, fullPath).replace(/\\/g, '/');
    const ext = path.extname(entry.name);
    if (!CODE_EXTENSIONS.has(ext)) continue;
    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      content = '';
    }

    results.push({
      path: relPath,
      name: path.basename(entry.name, ext),
      extension: ext,
      size: fs.statSync(fullPath).size,
      topLevelDir: relPath.split('/')[0] || '',
      line_count: countLines(content),
      function_count: countFunctions(content, ext),
      export_count: countExports(content, ext),
    });
  }
  return results;
}

function buildFileMap() {
  const files = walk(PROJECT_ROOT);
  return {
    generatedAt: Date.now(),
    files,
  };
}

export { buildFileMap };
