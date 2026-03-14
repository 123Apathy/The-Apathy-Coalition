import path from 'path';
import { getUserDataRoot } from './runtime/user-data.js';

/**
 * Central path resolver for thepopebot.
 * All paths resolve from process.cwd() (the user's project root).
 */

const PROJECT_ROOT = process.env.POPEBOT_REPO_ROOT || process.cwd();
export const USER_DATA_ROOT = getUserDataRoot();

export {
  PROJECT_ROOT,
};

// config/ files
export const configDir = path.join(PROJECT_ROOT, 'config');
export const cronsFile = path.join(PROJECT_ROOT, 'config', 'CRONS.json');
export const triggersFile = path.join(PROJECT_ROOT, 'config', 'TRIGGERS.json');
export const jobPlanningMd = path.join(PROJECT_ROOT, 'config', 'JOB_PLANNING.md');
export const codePlanningMd = path.join(PROJECT_ROOT, 'config', 'CODE_PLANNING.md');
export const jobSummaryMd = path.join(PROJECT_ROOT, 'config', 'JOB_SUMMARY.md');
export const soulMd = path.join(PROJECT_ROOT, 'config', 'SOUL.md');
export const claudeMd = path.join(PROJECT_ROOT, 'CLAUDE.md');
export const skillGuidePath = path.join(PROJECT_ROOT, 'config', 'SKILL_BUILDING_GUIDE.md');

// Skills directory
export const skillsDir = path.join(PROJECT_ROOT, 'skills');

// Working directories for command-type actions
export const cronDir = path.join(PROJECT_ROOT, 'cron');
export const triggersDir = path.join(PROJECT_ROOT, 'triggers');

// Logs
export const logsDir = path.join(USER_DATA_ROOT, 'logs');

// Data (SQLite memory, etc.)
export const dataDir = path.join(USER_DATA_ROOT, 'data');

// Database
export const thepopebotDb = process.env.DATABASE_PATH || path.join(dataDir, 'thepopebot.sqlite');

// Cluster data (bind-mount root for cluster containers)
export const clusterDataDir = process.env.CLUSTER_DATA_PATH || path.join(dataDir, 'clusters');

// .env
export const envFile = path.join(PROJECT_ROOT, '.env');

// Model performance tracking
export const modelPerformanceFile = path.join(USER_DATA_ROOT, 'model-performance.json');

// Memory system
export const memoryDir = path.join(USER_DATA_ROOT, 'memory');
export const memoryEmbeddingsDir = path.join(memoryDir, 'embeddings');
export const codebaseSystemMapFile = path.join(memoryDir, 'codebase', 'system-map.json');
export const codeSearchDir = path.join(memoryDir, 'code-search');
export const codeSearchIndexFile = path.join(codeSearchDir, 'documents.json');
export const codeSearchEmbeddingsFile = path.join(codeSearchDir, 'embeddings.json');
export const memorySkillsDir = path.join(memoryDir, 'skills');
export const memorySkillsEmbeddingsFile = path.join(memorySkillsDir, 'embeddings.json');
export const embeddingCacheFile = path.join(memoryDir, 'embedding-cache.json');
export const plannerCacheFile = path.join(memoryDir, 'planner-cache.json');
export const repoGraphFile = path.join(memoryDir, 'repo-graph.json');
export const controlTowerEventsFile = path.join(memoryDir, 'control-tower-events.jsonl');
