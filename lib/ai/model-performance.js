import fs from 'fs';
import { modelPerformanceFile } from '../paths.js';
import { MODEL_REGISTRY } from './model-registry.js';

let _benchmarkStarted = false;

function readPerformanceData() {
  try {
    if (!fs.existsSync(modelPerformanceFile)) return {};
    return JSON.parse(fs.readFileSync(modelPerformanceFile, 'utf8'));
  } catch {
    return {};
  }
}

function writePerformanceData(data) {
  fs.writeFileSync(modelPerformanceFile, JSON.stringify(data, null, 2) + '\n');
}

function normalizeCandidates(candidates) {
  if (Array.isArray(candidates)) return candidates.filter(Boolean);
  if (typeof candidates === 'string') return [candidates];
  return [];
}

function extractTokenCount(result) {
  const usage = result?.usage_metadata || result?.response_metadata?.tokenUsage;
  if (!usage) return 0;

  return (
    usage.total_tokens ||
    (usage.input_tokens || 0) + (usage.output_tokens || 0) ||
    (usage.promptTokens || 0) + (usage.completionTokens || 0) ||
    0
  );
}

function average(existing, next, count) {
  return ((existing * count) + next) / (count + 1);
}

export function recordModelResult(modelName, { latencyMs, tokenCount = 0, success = true } = {}) {
  if (!modelName || !Number.isFinite(latencyMs) || latencyMs < 0) return;

  const data = readPerformanceData();
  const current = data[modelName] || {
    avg_latency: 0,
    token_speed: 0,
    success_rate: 1,
    request_count: 0,
    success_count: 0,
  };

  const requestCount = current.request_count || 0;
  const successCount = current.success_count || 0;
  const nextSuccessCount = success ? successCount + 1 : successCount;
  const latencySeconds = latencyMs / 1000;
  const tokenSpeed = latencySeconds > 0 && tokenCount > 0 ? tokenCount / latencySeconds : 0;

  data[modelName] = {
    avg_latency: Number(average(current.avg_latency || 0, latencySeconds, requestCount).toFixed(3)),
    token_speed: Number(average(current.token_speed || 0, tokenSpeed, requestCount).toFixed(2)),
    success_rate: Number((nextSuccessCount / (requestCount + 1)).toFixed(3)),
    request_count: requestCount + 1,
    success_count: nextSuccessCount,
  };

  writePerformanceData(data);
}

export function choosePreferredModel(role, candidates) {
  const pool = normalizeCandidates(candidates ?? MODEL_REGISTRY[role]);
  if (pool.length <= 1) return pool[0] || MODEL_REGISTRY.chat;

  const data = readPerformanceData();
  const scored = pool.map((modelName) => {
    const stats = data[modelName] || {};
    return {
      modelName,
      successRate: stats.success_rate ?? 0.5,
      latency: stats.avg_latency ?? Number.POSITIVE_INFINITY,
      tokenSpeed: stats.token_speed ?? 0,
    };
  });

  scored.sort((a, b) => {
    if (b.successRate !== a.successRate) return b.successRate - a.successRate;
    if (a.latency !== b.latency) return a.latency - b.latency;
    return b.tokenSpeed - a.tokenSpeed;
  });

  return scored[0]?.modelName || pool[0] || MODEL_REGISTRY.chat;
}

function wrapInvocationResult(result, onDone) {
  if (!result || typeof result[Symbol.asyncIterator] !== 'function') {
    onDone(result, true);
    return result;
  }

  async function* wrapped() {
    let lastChunk = null;
    try {
      for await (const chunk of result) {
        lastChunk = chunk;
        yield chunk;
      }
      onDone(lastChunk, true);
    } catch (err) {
      onDone(lastChunk, false);
      throw err;
    }
  }

  return wrapped();
}

export function instrumentModel(model, modelName) {
  if (!model || model.__performanceWrapped) return model;

  const originalInvoke = model.invoke?.bind(model);
  if (originalInvoke) {
    model.invoke = async (...args) => {
      const started = Date.now();
      try {
        const result = await originalInvoke(...args);
        recordModelResult(modelName, {
          latencyMs: Date.now() - started,
          tokenCount: extractTokenCount(result),
          success: true,
        });
        return result;
      } catch (err) {
        recordModelResult(modelName, {
          latencyMs: Date.now() - started,
          tokenCount: 0,
          success: false,
        });
        throw err;
      }
    };
  }

  const originalStream = model.stream?.bind(model);
  if (originalStream) {
    model.stream = async (...args) => {
      const started = Date.now();
      try {
        const stream = await originalStream(...args);
        return wrapInvocationResult(stream, (lastChunk, success) => {
          recordModelResult(modelName, {
            latencyMs: Date.now() - started,
            tokenCount: extractTokenCount(lastChunk),
            success,
          });
        });
      } catch (err) {
        recordModelResult(modelName, {
          latencyMs: Date.now() - started,
          tokenCount: 0,
          success: false,
        });
        throw err;
      }
    };
  }

  model.__performanceWrapped = true;
  return model;
}

export async function runStartupBenchmark(createModel) {
  if (_benchmarkStarted) return;
  _benchmarkStarted = true;

  if (fs.existsSync(modelPerformanceFile)) return;
  if ((process.env.LLM_PROVIDER || 'anthropic') !== 'custom') return;

  const tests = [
    {
      role: 'chat',
      prompt: 'Say hello in one short sentence.',
    },
    {
      role: 'reasoning',
      prompt: 'If I have 12 apples and give away 5, how many remain? Answer briefly.',
    },
    {
      role: 'coding',
      prompt: 'Write a JavaScript function that adds two numbers.',
    },
  ];

  writePerformanceData({});

  for (const test of tests) {
    const modelName = MODEL_REGISTRY[test.role];
    if (!modelName) continue;

    try {
      const model = await createModel({
        modelName,
        routingContext: { message: test.prompt, roleHint: test.role },
      });
      await model.invoke([['human', test.prompt]]);
    } catch (err) {
      // createModel() returns an instrumented model, so invoke failures are already recorded
    }
  }
}
