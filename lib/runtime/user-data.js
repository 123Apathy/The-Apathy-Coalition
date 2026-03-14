import fs from 'fs';
import os from 'os';
import path from 'path';

export const APP_NAME = 'The Apathy Coalition';
export const APP_SLUG = 'the-apathy-coalition';

function resolveDefaultUserDataRoot() {
  if (process.env.APATHY_DATA_DIR) return path.resolve(process.env.APATHY_DATA_DIR);
  if (process.env.POPEBOT_USER_DATA_DIR) return path.resolve(process.env.POPEBOT_USER_DATA_DIR);

  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, APP_NAME);
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', APP_NAME);
  }

  const xdgDataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(xdgDataHome, APP_SLUG);
}

export function getUserDataRoot() {
  return resolveDefaultUserDataRoot();
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function copyIfMissing(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath) || fs.existsSync(targetPath)) return;
  ensureDir(path.dirname(targetPath));
  fs.cpSync(sourcePath, targetPath, { recursive: true });
}

export function migrateLegacyRepoState(projectRoot, userDataRoot = getUserDataRoot()) {
  const legacyDataDir = path.join(projectRoot, 'data');
  const legacyMemoryDir = path.join(projectRoot, 'memory');
  const legacyModelPerformanceFile = path.join(projectRoot, 'model-performance.json');

  copyIfMissing(legacyDataDir, path.join(userDataRoot, 'data'));
  copyIfMissing(legacyMemoryDir, path.join(userDataRoot, 'memory'));
  copyIfMissing(legacyModelPerformanceFile, path.join(userDataRoot, 'model-performance.json'));
}

export function ensureUserDataLayout(projectRoot) {
  const userDataRoot = getUserDataRoot();
  migrateLegacyRepoState(projectRoot, userDataRoot);

  ensureDir(userDataRoot);
  ensureDir(path.join(userDataRoot, 'data'));
  ensureDir(path.join(userDataRoot, 'logs'));
  ensureDir(path.join(userDataRoot, 'memory'));
  ensureDir(path.join(userDataRoot, 'workspaces'));
  ensureDir(path.join(userDataRoot, 'installer'));

  return userDataRoot;
}
