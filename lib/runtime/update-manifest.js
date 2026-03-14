export const UPDATE_PRESERVE_PATHS = [
  'data',
  'memory',
  'logs',
  'workspaces',
  'installer',
  'model-performance.json',
];

export function getUpdateManifest() {
  return {
    appId: 'coalition.desktop',
    productName: 'The Apathy Coalition',
    preservePaths: UPDATE_PRESERVE_PATHS,
    channels: ['stable', 'beta'],
  };
}
