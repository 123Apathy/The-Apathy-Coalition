function buildSearchContextBlock(results = []) {
  if (!results.length) return '';

  const lines = [
    'Repository Search Context',
    'Use these semantically relevant files and module summaries as repository guidance.',
  ];

  for (const result of results) {
    const doc = result.document || {};
    lines.push(
      [
        `File: ${result.file}`,
        `Reason: ${result.reason}`,
        `Relevance: ${result.relevance}`,
        doc.architecture_summary ? `Architecture: ${doc.architecture_summary}` : '',
        doc.dependencies?.length ? `Dependencies: ${doc.dependencies.join(', ')}` : '',
        doc.code_snippet_preview ? `Preview:\n${String(doc.code_snippet_preview).slice(0, 600)}` : '',
      ].filter(Boolean).join('\n')
    );
  }

  return lines.join('\n\n');
}

export { buildSearchContextBlock };
