import fs from 'fs';
import path from 'path';

function getExpertDirectories() {
  const projectRoot = process.cwd();
  return [
    path.join(projectRoot, 'dreamteam', 'expert-modules'),
    path.join(projectRoot, 'dreamteam'),
  ];
}

function parseExpertModule(filename, content) {
  const nameMatch = content.match(/^#\s+(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : path.basename(filename, path.extname(filename));
  const domain = path.basename(filename, path.extname(filename));

  return {
    name,
    domain,
    instructions: content.trim(),
  };
}

function loadExpertModules() {
  for (const dir of getExpertDirectories()) {
    if (!fs.existsSync(dir)) continue;

    return fs.readdirSync(dir)
      .filter((file) => file.endsWith('.txt') || file.endsWith('.md'))
      .map((file) => {
        const fullPath = path.join(dir, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        return parseExpertModule(file, content);
      });
  }

  return [];
}

function getExpertByDomain(domain) {
  return loadExpertModules().find((expert) => expert.domain === domain) || null;
}

export { loadExpertModules, getExpertByDomain };
