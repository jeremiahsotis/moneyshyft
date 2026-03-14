export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getJobBlock(workflow: string, jobName: string): string {
  const pattern = new RegExp(
    `(?:^|\\n)\\s{2}${escapeRegex(jobName)}:\\s*\\n([\\s\\S]*?)(?=\\n\\s{2}[A-Za-z0-9_-]+:\\s*\\n|$)`,
  );
  const match = workflow.match(pattern);
  return match?.[1] ?? '';
}

export function getNeeds(jobBlock: string): string[] {
  const inlineNeeds = jobBlock.match(/^\s{4}needs:\s*([^\n]+)\s*$/m);
  if (inlineNeeds) {
    const value = inlineNeeds[1].trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      return value
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return value ? [value] : [];
  }

  const multilineNeeds = jobBlock.match(/^\s{4}needs:\s*\n((?:\s{6}-\s*[^\n]+\n?)+)/m);
  if (!multilineNeeds) return [];

  return multilineNeeds[1]
    .split('\n')
    .map((line) => {
      const match = line.match(/^\s{6}-\s*([^\n]+)/);
      return match ? match[1].trim() : '';
    })
    .filter(Boolean);
}
