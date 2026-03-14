import { getUpdateManifest } from '../lib/runtime/update-manifest.js';
import { getUserDataRoot } from '../lib/runtime/user-data.js';

console.log(JSON.stringify({
  ...getUpdateManifest(),
  userDataRoot: getUserDataRoot(),
}, null, 2));
