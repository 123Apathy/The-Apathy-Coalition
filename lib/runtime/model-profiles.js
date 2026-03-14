import os from 'os';

export const MODEL_PROFILES = {
  lite: {
    id: 'lite',
    label: 'Lite',
    minimumRamGb: 8,
    recommendedRamGb: 16,
    bundle: {
      chat: 'gemma3:4b',
      coding: 'qwen2.5-coder:3b',
      reasoning: 'gemma3:12b',
      embeddings: 'nomic-embed-text-v2-moe',
    },
  },
  standard: {
    id: 'standard',
    label: 'Standard',
    minimumRamGb: 16,
    recommendedRamGb: 32,
    bundle: {
      chat: 'gemma3:12b',
      coding: 'qwen2.5-coder:7b',
      reasoning: 'lfm2.5-thinking',
      embeddings: 'nomic-embed-text-v2-moe',
    },
  },
  power: {
    id: 'power',
    label: 'Power',
    minimumRamGb: 32,
    recommendedRamGb: 64,
    bundle: {
      chat: 'gemma3:12b',
      coding: 'qwen2.5-coder:7b',
      reasoning: 'deepseek-r1:14b',
      embeddings: 'nomic-embed-text-v2-moe',
      vision: 'qwen2.5vl',
      ocr: 'deepseek-ocr',
    },
  },
};

export function inspectLocalSystem() {
  return {
    platform: process.platform,
    arch: process.arch,
    cpuCount: os.cpus()?.length || 1,
    totalMemoryGb: Math.round((os.totalmem() / 1024 / 1024 / 1024) * 10) / 10,
  };
}

export function detectModelProfile(system = inspectLocalSystem()) {
  if (system.totalMemoryGb >= MODEL_PROFILES.power.minimumRamGb && system.cpuCount >= 8) {
    return MODEL_PROFILES.power;
  }

  if (system.totalMemoryGb >= MODEL_PROFILES.standard.minimumRamGb && system.cpuCount >= 4) {
    return MODEL_PROFILES.standard;
  }

  return MODEL_PROFILES.lite;
}
