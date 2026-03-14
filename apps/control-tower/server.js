import { createServer } from 'http';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import next from 'next';
import dotenv from 'dotenv';

const dev = process.env.NODE_ENV !== 'production';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = process.env.POPEBOT_REPO_ROOT || path.resolve(__dirname, '../../');
process.chdir(repoRoot);
dotenv.config({ path: path.resolve(repoRoot, '.env') });

const { attachControlTowerWebSocket } = await import(
  pathToFileURL(path.resolve(repoRoot, 'lib/control-tower/event-bus.js')).href
);
const { initDatabase } = await import(
  pathToFileURL(path.resolve(repoRoot, 'lib/db/index.js')).href
);

initDatabase();
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app.didWebSocketSetup = true;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  attachControlTowerWebSocket(server);

  const port = process.env.PORT || 3010;
  server.listen(port, () => {
    console.log(`> Control Tower ready on http://localhost:${port}`);
  });
});
