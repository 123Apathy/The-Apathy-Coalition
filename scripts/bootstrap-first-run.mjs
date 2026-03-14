import fs from 'fs';
import path from 'path';
import { detectModelProfile, inspectLocalSystem } from '../lib/runtime/model-profiles.js';
import { ensureUserDataLayout, getUserDataRoot } from '../lib/runtime/user-data.js';

const projectRoot = process.cwd();
const userDataRoot = ensureUserDataLayout(projectRoot);
const system = inspectLocalSystem();
const profile = detectModelProfile(system);

const bootstrapStateFile = path.join(userDataRoot, 'installer', 'bootstrap-state.json');
const payload = {
  product: 'The Apathy Coalition',
  initializedAt: new Date().toISOString(),
  projectRoot,
  userDataRoot: getUserDataRoot(),
  system,
  recommendedProfile: profile,
};

fs.writeFileSync(bootstrapStateFile, JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify(payload, null, 2));
