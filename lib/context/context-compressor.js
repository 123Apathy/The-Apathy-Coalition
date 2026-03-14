import { z } from 'zod';
import { createModel } from '../ai/model.js';

const CompressedContextSchema = z.object({
  summary: z.string(),
});

function truncateContext(content, maxChars = 1200) {
  const text = String(content || '').trim();
  if (!text) return '';
  return text.length > maxChars ? `${text.slice(0, maxChars - 3)}...` : text;
}

async function compressContextBlock(block, options = {}) {
  const content = String(block?.content || '').trim();
  if (!content) return '';

  const targetChars = options.targetChars || 900;
  if (content.length <= targetChars) {
    return content;
  }

  try {
    const model = await createModel({
      modelName: options.modelName,
      routingContext: {
        message: content,
        roleHint: 'reasoning',
      },
      maxTokens: 500,
    });

    const result = await model.withStructuredOutput(CompressedContextSchema).invoke([
      ['system',
        [
          'You compress planning context for a local coding agent.',
          'Preserve only the most actionable architecture, file, and implementation details.',
          'Return a short summary only.',
        ].join(' ')
      ],
      ['human',
        [
          `Context type: ${block.type}`,
          `Original content:\n${content}`,
        ].join('\n\n')
      ],
    ]);

    return truncateContext(result.summary, targetChars);
  } catch {
    return truncateContext(content, targetChars);
  }
}

export { compressContextBlock, truncateContext };
