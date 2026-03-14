import fs from 'fs';
import path from 'path';
import { PROJECT_ROOT } from '../paths.js';

const IMPORT_RE = /import\s+[^'"]*['"]([^'"]+)['"]/g;
const REQUIRE_RE = /require\(\s*['"]([^'"]+)['"]\s*\)/g;

function resolveDependency(sourcePath, specifier) {
  if (!specifier.startsWith('.')) {
    return { type: 'external', target: specifier };
  }

  const baseDir = path.dirname(path.join(PROJECT_ROOT, sourcePath));
  const candidate = path.normalize(path.join(baseDir, specifier));
  const rel = path.relative(PROJECT_ROOT, candidate).replace(/\\/g, '/');
  return { type: 'internal', target: rel };
}

function extractSpecifiers(content) {
  const found = [];
  let match;
  while ((match = IMPORT_RE.exec(content))) found.push(match[1]);
  while ((match = REQUIRE_RE.exec(content))) found.push(match[1]);
  return found;
}

function buildDependencyMap(fileMap) {
  const dependencies = [];

  for (const file of fileMap.files) {
    if (!['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(file.extension)) continue;
    const fullPath = path.join(PROJECT_ROOT, file.path);
    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    const imports = extractSpecifiers(content).map((specifier) => ({
      specifier,
      ...resolveDependency(file.path, specifier),
    }));

    dependencies.push({
      source: file.path,
      imports,
    });
  }

  return {
    generatedAt: Date.now(),
    dependencies,
  };
}

export { buildDependencyMap };
