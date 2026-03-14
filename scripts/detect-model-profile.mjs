import { detectModelProfile, inspectLocalSystem } from '../lib/runtime/model-profiles.js';
import { getUserDataRoot } from '../lib/runtime/user-data.js';
import { getUpdateManifest } from '../lib/runtime/update-manifest.js';

const system = inspectLocalSystem();
const profile = detectModelProfile(system);
const manifest = getUpdateManifest();

console.log(JSON.stringify({
  product: manifest.productName,
  userDataRoot: getUserDataRoot(),
  system,
  recommendedProfile: profile,
  updatePreservePaths: manifest.preservePaths,
}, null, 2));
