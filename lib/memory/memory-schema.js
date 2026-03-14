import { z } from 'zod';

const MEMORY_TYPES = [
  'architecture',
  'decisions',
  'experiments',
  'failures',
  'expert-learnings',
  'codebase',
  'governance',
];

const MEMORY_BIAS = ['chat', 'reasoning', 'coding', 'vision', 'ocr', 'embeddings'];

export const memoryDocumentSchema = z.object({
  id: z.string(),
  type: z.enum(MEMORY_TYPES),
  title: z.string(),
  summary: z.string(),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  model_bias: z.array(z.enum(MEMORY_BIAS)).default([]),
  source: z.object({
    kind: z.string(),
    ref: z.string().optional(),
  }),
  created_at: z.number(),
  updated_at: z.number(),
  embedding_model: z.string().default('nomic-embed-text-v2-moe'),
});

export const memoryVectorSchema = z.object({
  memory_id: z.string(),
  type: z.enum(MEMORY_TYPES),
  embedding: z.array(z.number()),
  updated_at: z.number(),
});

export function normalizeMemoryDocument(input) {
  return memoryDocumentSchema.parse(input);
}

export function formatMemoryForEmbedding(doc) {
  return [
    `Type: ${doc.type}`,
    `Title: ${doc.title}`,
    doc.summary ? `Summary: ${doc.summary}` : '',
    doc.tags?.length ? `Tags: ${doc.tags.join(', ')}` : '',
    doc.content,
  ].filter(Boolean).join('\n');
}

export function getMemoryTypes() {
  return [...MEMORY_TYPES];
}
