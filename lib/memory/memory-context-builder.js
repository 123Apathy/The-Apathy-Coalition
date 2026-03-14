function truncate(text, max = 400) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function buildMemoryContextBlock(items = []) {
  if (!items.length) return '';

  const lines = ['## Retrieved Memory Context'];
  for (const item of items) {
    lines.push(`- [${item.type}] ${item.title}`);
    if (item.summary) lines.push(`  Summary: ${truncate(item.summary, 220)}`);
    if (item.content) lines.push(`  Note: ${truncate(item.content, 320)}`);
  }

  return lines.join('\n');
}

export { buildMemoryContextBlock };
