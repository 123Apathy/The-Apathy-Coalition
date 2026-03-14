/**
 * Next.js instrumentation hook for thepopebot.
 * This file is loaded by Next.js on server start when instrumentationHook is enabled.
 *
 * Users should create an instrumentation.js in their project root that imports this:
 *
 *   export { register } from 'thepopebot/instrumentation';
 *
 * Or they can re-export and add their own logic.
 */

let initialized = false;

export async function register() {
  // Only run on the server, and only once
  if (typeof window !== 'undefined' || initialized) return;
  initialized = true;

  // Skip database init and cron scheduling during `next build` —
  // these are runtime-only concerns that keep the event loop alive
  // and can cause build output corruption.
  if (process.argv.includes('build')) return;

  // Load .env from project root
  const dotenv = await import('dotenv');
  dotenv.config();

  // Set AUTH_URL from APP_URL so NextAuth redirects to the correct host (e.g., on sign-out)
  if (process.env.APP_URL && !process.env.AUTH_URL) {
    process.env.AUTH_URL = process.env.APP_URL;
  }

  // Validate AUTH_SECRET is set (required by Auth.js for session encryption)
  if (!process.env.AUTH_SECRET) {
    console.error('\n  ERROR: AUTH_SECRET is not set in your .env file.');
    console.error('  This is required for session encryption.');
    console.error('  Run "npm run setup" to generate it automatically, or add manually:');
    console.error('  openssl rand -base64 32\n');
    throw new Error('AUTH_SECRET environment variable is required');
  }

  // Initialize auth database
  const { initDatabase } = await import('../lib/db/index.js');
  initDatabase();

  // Start cron scheduler
  const { loadCrons } = await import('../lib/cron.js');
  loadCrons();

  // Start built-in crons (version check)
  const { startBuiltinCrons, setUpdateAvailable } = await import('../lib/cron.js');
  startBuiltinCrons();

  // Warm in-memory flag from DB (covers the window before the async cron fetch completes)
  try {
    const { getAvailableVersion } = await import('../lib/db/update-check.js');
    const stored = getAvailableVersion();
    if (stored) setUpdateAvailable(stored);
  } catch {}

  // Start cluster worker runtime (crons + webhook registration)
  const { startClusterRuntime } = await import('../lib/cluster/runtime.js');
  startClusterRuntime();

  // Run lightweight one-time model benchmark for local Ollama routing.
  try {
    const { runStartupBenchmark } = await import('../lib/ai/model-performance.js');
    const { createModel } = await import('../lib/ai/model.js');
    runStartupBenchmark(createModel).catch((err) => {
      console.warn('[model benchmark] failed:', err.message);
    });
  } catch (err) {
    console.warn('[model benchmark] unavailable:', err.message);
  }

  // Build local codebase intelligence snapshot at startup.
  try {
    const { runCodebaseIntelligence } = await import('../lib/codebase-intelligence/codebase-memory-writer.js');
    runCodebaseIntelligence().catch((err) => {
      console.warn('[codebase intelligence] failed:', err.message);
    });
  } catch (err) {
    console.warn('[codebase intelligence] unavailable:', err.message);
  }

  // Optional scheduled self-improvement scan.
  try {
    const { startSelfImprovementScheduler } = await import('../lib/autodev/self-improvement-loop.js');
    startSelfImprovementScheduler();
  } catch (err) {
    console.warn('[autodev] scheduler unavailable:', err.message);
  }

  console.log('thepopebot initialized');
}
