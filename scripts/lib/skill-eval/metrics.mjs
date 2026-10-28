import { createHash } from 'node:crypto';

export const digest = (value) => createHash('sha256').update(value).digest('hex');
export function artifactDigest(artifact) {
  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value !== null && typeof value === 'object') return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
    return value;
  }
  return digest(JSON.stringify(canonical(artifact)));
}

const tokenKeys = ['inputTokens', 'cachedInputTokens', 'cacheWriteInputTokens', 'outputTokens', 'reasoningOutputTokens'];
const number = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
export function normalizeUsage(usage = {}) {
  const values = [usage.input_tokens, usage.cached_input_tokens ?? usage.cache_read_input_tokens,
    usage.cache_write_input_tokens, usage.output_tokens, usage.reasoning_output_tokens];
  const result = Object.fromEntries(tokenKeys.map((key, index) => [key, number(values[index])]));
  result.totalTokens = result.inputTokens !== null && result.outputTokens !== null
    ? result.inputTokens + result.outputTokens : null;
  return result;
}

function sumUsage(usages) {
  return Object.fromEntries([...tokenKeys, 'totalTokens'].map((key) => [key,
    usages.length && usages.every((usage) => usage[key] !== null)
      ? usages.reduce((total, usage) => total + usage[key], 0) : null]));
}

const toolTypes = new Set(['command_execution', 'mcp_tool_call', 'web_search', 'file_change',
  'image_generation', 'collab_tool_call', 'custom_tool_call', 'function_call']);

export function parseCodexStream(text) {
  const toolIds = new Set();
  const messages = new Map();
  const usages = [];
  const errors = [];
  const models = new Set();
  let malformedLines = 0;
  let completedTurns = 0;
  let failedTurns = 0;
  let sequence = 0;
  let unknownCompletedItems = 0;
  for (const line of text.split('\n').filter((value) => value.trim())) {
    let event;
    try { event = JSON.parse(line); } catch { malformedLines++; continue; }
    if (typeof event.model === 'string') models.add(event.model);
    if (event.type === 'turn.completed') {
      completedTurns++;
      if (event.usage) usages.push(normalizeUsage(event.usage));
    }
    if (event.type === 'turn.failed' || event.type === 'error') {
      failedTurns++;
      errors.push(event.error?.message ?? event.message ?? event.type);
    }
    if (event.type !== 'item.completed' || !event.item) continue;
    const item = event.item;
    if (item.type === 'agent_message') messages.set(item.id ?? `message-${sequence++}`, item.text ?? '');
    else if (toolTypes.has(item.type)) toolIds.add(item.id ?? `missing-id-${sequence++}`);
    else if (!['reasoning', 'plan', 'todo_list', 'error'].includes(item.type)) unknownCompletedItems++;
  }
  return { usage: sumUsage(usages.length === completedTurns ? usages : []), completedToolCalls: toolIds.size, agentMessages: messages.size,
    artifactText: [...messages.values()].at(-1) ?? '', completedTurns, failedTurns,
    malformedLines, unknownCompletedItems, errors, observedModels: [...models] };
}

export function parseNativeSession(text) {
  const responses = new Map();
  const tools = new Set();
  const models = new Set();
  const efforts = new Set();
  let cumulative = null;
  let malformedLines = 0;
  let agentMessages = 0;
  let artifactText = '';
  let taskState = 'unknown';
  let startedTasks = 0;
  let completedTasks = 0;
  let interruptedTasks = 0;
  for (const line of text.split('\n').filter((value) => value.trim())) {
    let event;
    try { event = JSON.parse(line); } catch { malformedLines++; continue; }
    const payload = event.payload ?? {};
    if (typeof payload.model === 'string') models.add(payload.model);
    if (event.type === 'turn_context') {
      const effort = payload.effort ?? payload.reasoning_effort ?? payload.reasoningEffort;
      if (typeof effort === 'string') efforts.add(effort);
    }
    if (event.type === 'event_msg') {
      if (['task_started', 'turn_started'].includes(payload.type)) { taskState = 'started'; startedTasks++; }
      if (['task_complete', 'turn_complete'].includes(payload.type)) {
        taskState = 'completed'; completedTasks++;
        if (typeof payload.last_agent_message === 'string') artifactText = payload.last_agent_message;
      }
      if (['turn_aborted', 'task_aborted', 'task_interrupted'].includes(payload.type)) { taskState = 'interrupted'; interruptedTasks++; }
    }
    if (event.type === 'token_usage_record' && payload.response_id && payload.usage) {
      responses.set(payload.response_id, normalizeUsage(payload.usage));
    }
    if (event.type === 'event_msg' && payload.type === 'token_count' && payload.info?.total_token_usage) {
      cumulative = normalizeUsage(payload.info.total_token_usage);
    }
    if (event.type === 'response_item' && ['custom_tool_call', 'function_call'].includes(payload.type)) {
      tools.add(payload.call_id ?? payload.id ?? digest(line));
    }
    if (event.type === 'response_item' && payload.type === 'message' && payload.role === 'assistant') {
      const output = (payload.content ?? []).filter((part) => part.type === 'output_text').map((part) => part.text).join('\n');
      if (output) { agentMessages++; if (payload.phase === 'final_answer') artifactText = output; }
    }
  }
  return { usage: responses.size ? sumUsage([...responses.values()]) : cumulative ?? sumUsage([]),
    usageSource: responses.size ? 'response-records' : cumulative ? 'session-cumulative' : 'unknown',
    completedToolCalls: tools.size, toolCountBasis: 'invocations (native logs may omit completion status)',
    agentMessages, artifactText, malformedLines, observedModels: [...models], observedEfforts: [...efforts],
    taskState, startedTasks, completedTasks, interruptedTasks };
}

export function textMetrics(text) {
  const prose = text.replace(/```[\s\S]*?```/g, '').replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/^\s*#{1,6}\s.*$/gmu, '').replace(/^\s*\|.*$/gmu, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/gu, '$1').replace(/\[([^\]]*)\]\([^)]*\)/gu, '$1')
    .replace(/`[^`\n]+`/gu, 'identifier');
  const words = text.match(/\S+/gu) ?? [];
  const sentences = prose.split(/[.!?]+(?:\s|$)/u).map((value) => value.trim()).filter(Boolean);
  const lengths = sentences.map((sentence) => (sentence.match(/\S+/gu) ?? []).length);
  return { bytes: Buffer.byteLength(text), words: words.length,
    heuristicSentences: sentences.length,
    heuristicMeanSentenceWords: lengths.length ? lengths.reduce((total, count) => total + count, 0) / lengths.length : null,
    heuristicMaxSentenceWords: lengths.length ? Math.max(...lengths) : null,
    heuristicSentenceWords: lengths,
    heuristicSemicolons: (prose.match(/;/gu) ?? []).length };
}

export function parseArtifact(text) {
  const unwrapped = text.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/u, '$1');
  try {
    const object = JSON.parse(unwrapped);
    if (object && !Array.isArray(object) && typeof object === 'object' && typeof object.artifactText === 'string') {
      return { artifactText: object.artifactText,
        ...(typeof object.verdict === 'string' ? { verdict: object.verdict } : {}),
        ...Object.fromEntries(['findings', 'proposedActions', 'evidence', 'limitations'].filter((key) => Array.isArray(object[key])).map((key) => [key, object[key]])) };
    }
  } catch {}
  return { artifactText: text };
}
