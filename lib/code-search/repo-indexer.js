import fs from 'fs';
import path from 'path';
import { buildFileMap } from '../codebase-intelligence/repo-scanner.js';
import { codebaseSystemMapFile, PROJECT_ROOT } from '../paths.js';

function readSystemMap() {
  try {
    return JSON.parse(fs.readFileSync(codebaseSystemMapFile, 'utf8'));
  } catch {
    return { modules: [] };
  }
}

function getSnippetPreview(filePath, maxLength = 1200) {
  try {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, filePath), 'utf8');
    return content.slice(0, maxLength);
  } catch {
    return '';
  }
}

function buildSearchDocument(file, moduleSummary) {
  const dependencies = moduleSummary?.dependencies || [];
  const architectureSummary = moduleSummary?.responsibility || 'No architecture summary available.';
  const fileSummary = [
    `${file.path} is a ${file.extension || 'file'} module in ${file.topLevelDir || 'the repository'}.`,
    `It has ${file.line_count || 0} lines, ${file.function_count || 0} functions, and ${file.export_count || 0} exports.`,
    moduleSummary?.importance_score ? `Importance score: ${moduleSummary.importance_score}.` : '',
  ].filter(Boolean).join(' ');

  return {
    id: file.path,
    file: file.path,
    file_summary: fileSummary,
    architecture_summary: architectureSummary,
    dependencies,
    code_snippet_preview: getSnippetPreview(file.path),
    line_count: file.line_count || 0,
    function_count: file.function_count || 0,
    export_count: file.export_count || 0,
    importance_score: moduleSummary?.importance_score || 0,
    content: [
      `File: ${file.path}`,
      `File summary: ${fileSummary}`,
      `Architecture summary: ${architectureSummary}`,
      dependencies.length ? `Dependencies: ${dependencies.join(', ')}` : 'Dependencies: none',
      'Code preview:',
      getSnippetPreview(file.path),
    ].join('\n\n'),
  };
}

function buildRepoSearchDocuments(fileMap = buildFileMap()) {
  const systemMap = readSystemMap();
  const modulesByPath = new Map((systemMap.modules || []).map((module) => [module.path, module]));

  return fileMap.files
    .filter((file) => file.path.startsWith('lib/') || file.path.startsWith('api/') || file.path.startsWith('config/'))
    .filter((file) => !file.path.endsWith('CLAUDE.md'))
    .map((file) => buildSearchDocument(file, modulesByPath.get(file.path)))
    .sort((a, b) => b.importance_score - a.importance_score || a.file.localeCompare(b.file));
}

export { buildRepoSearchDocuments };
