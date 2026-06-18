#!/usr/bin/env node
// DreamTeam structural validator.
// Enforces the file contract from _SYSTEM.md / RUBRIC.md across every expert file.
// Usage: node DreamTeam/scripts/validate.mjs   (exits non-zero on any failure)

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const expertsDir = join(here, '..', 'experts');

const REQUIRED_KEYS = [
  'name', 'slug', 'domain', 'mission', 'owns', 'excludes', 'inputs',
  'outputs', 'kpis', 'depends_on', 'escalates_to', 'cadence',
];
const REQUIRED_SECTIONS = [
  'Purpose', "Owns / Doesn't Own", 'Core Principles', 'KPIs',
  'Decision Gate', 'Failure Modes', 'Worked Example',
  'Tooling & Data Sources', 'Collaborates With', 'Glossary',
  'Cross-Panel Learnings', 'Changelog',
];

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  return m[1];
}

// Extract the block of lines belonging to a frontmatter key (the key line plus
// the indented list items beneath it, up to the next top-level key).
function blockFor(fm, key) {
  const lines = fm.split('\n');
  const start = lines.findIndex((l) => new RegExp(`^${key}:`).test(l));
  if (start === -1) return '';
  const out = [lines[start]];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\S/.test(lines[i])) break; // next top-level key
    out.push(lines[i]);
  }
  return out.join('\n');
}

// Pull slugs referenced in a frontmatter list like `depends_on: [a, b]` or block
// list. Scoped to the key's own block so arrows elsewhere (e.g. "cue → reward"
// inside an `owns` item) are not mistaken for routing references.
function refsFor(fm, key) {
  const block = blockFor(fm, key);
  const inline = block.match(new RegExp(`^${key}:\\s*\\[(.*?)\\]`, 'm'));
  if (inline) {
    return inline[1].split(',').map((s) => s.trim()).filter(Boolean);
  }
  // block list: collect "(→ slug)" routing arrows (used by excludes)
  return [...block.matchAll(/→\s*([a-z0-9-]+)\s*\)/g)].map((a) => a[1]);
}

const files = readdirSync(expertsDir).filter((f) => f.endsWith('.md'));
const slugs = files.map((f) => f.replace(/\.md$/, ''));
const slugSet = new Set(slugs);

let failures = 0;
const rows = [];

for (const file of files.sort()) {
  const slug = file.replace(/\.md$/, '');
  const text = readFileSync(join(expertsDir, file), 'utf8');
  const issues = [];

  const fm = parseFrontmatter(text);
  if (!fm) {
    issues.push('missing YAML frontmatter');
  } else {
    for (const k of REQUIRED_KEYS) {
      if (!new RegExp(`^${k}:`, 'm').test(fm)) issues.push(`frontmatter missing "${k}"`);
    }
    const declaredSlug = (fm.match(/^slug:\s*(\S+)/m) || [])[1];
    if (declaredSlug && declaredSlug !== slug) {
      issues.push(`slug "${declaredSlug}" != filename "${slug}"`);
    }
    // Referential integrity: depends_on / escalates_to / excludes must point to real experts.
    for (const key of ['depends_on', 'escalates_to', 'excludes']) {
      for (const ref of refsFor(fm, key)) {
        if (!slugSet.has(ref)) issues.push(`${key} → unknown slug "${ref}"`);
      }
    }
  }

  for (const s of REQUIRED_SECTIONS) {
    if (!text.includes(`## ${s}`) && !text.includes(s)) {
      issues.push(`missing section "${s}"`);
    }
  }

  // Body quality gates.
  const body = text.replace(/^---\n[\s\S]*?\n---/, '');
  const emptyBullets = (body.match(/^\s*-\s*$/gm) || []).length;
  if (emptyBullets) issues.push(`${emptyBullets} empty bullet(s)`);
  if (/____/.test(body)) issues.push('contains "____" placeholder');

  if (issues.length) failures += 1;
  rows.push({ slug, status: issues.length ? 'FAIL' : 'ok', issues });
}

const width = Math.max(...rows.map((r) => r.slug.length));
for (const r of rows) {
  const mark = r.status === 'ok' ? '✓' : '✗';
  console.log(`${mark} ${r.slug.padEnd(width)}  ${r.issues.join('; ')}`);
}

console.log(`\n${files.length} experts · ${files.length - failures} passing · ${failures} failing`);
process.exit(failures ? 1 : 0);
