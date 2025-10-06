// Lightweight audit logging for AI agent executions
// Tracks performance, cost, and errors for production monitoring

export interface AuditLogEntry {
  request_id: string;
  agent_type: 'risk_scorer' | 'virtual_eligibility' | 'outreach_sequencer' | 'waitlist_matcher' | 'daily_summary' | 'waitlist_analyzer';
  latency_ms: number;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  status: 'success' | 'error' | 'partial';
  error_message?: string;
  appointment_id?: string;
  patient_id?: string;
}

/**
 * Generate a simple request ID (timestamp + random)
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate estimated cost based on OpenAI pricing
 * GPT-4o pricing (as of 2025): $2.50 per 1M input tokens, $10 per 1M output tokens
 */
export function calculateCost(inputTokens: number, outputTokens: number, model: string): number {
  // Simplified pricing - adjust based on actual model
  const INPUT_COST_PER_1M = 2.50;
  const OUTPUT_COST_PER_1M = 10.00;

  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_1M;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;

  return inputCost + outputCost;
}

/**
 * Log agent execution to backend
 */
export async function logAgentExecution(entry: AuditLogEntry): Promise<void> {
  try {
    await fetch('http://localhost:3001/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        log_id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...entry,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    // Silent fail - don't crash the app if audit logging fails
    console.error('Failed to log audit entry:', error);
  }
}

/**
 * Wrapper for agent execution with automatic audit logging
 */
export async function withAuditLogging<T>(
  agentType: AuditLogEntry['agent_type'],
  model: string,
  fn: () => Promise<{ result: T; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }>,
  context?: { appointment_id?: string; patient_id?: string }
): Promise<T> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { result, usage } = await fn();
    const latency = Date.now() - startTime;

    // Log successful execution
    await logAgentExecution({
      request_id: requestId,
      agent_type: agentType,
      latency_ms: latency,
      model,
      input_tokens: usage.prompt_tokens,
      output_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      estimated_cost_usd: calculateCost(usage.prompt_tokens, usage.completion_tokens, model),
      status: 'success',
      ...context
    });

    return result;
  } catch (error) {
    const latency = Date.now() - startTime;

    // Log error
    await logAgentExecution({
      request_id: requestId,
      agent_type: agentType,
      latency_ms: latency,
      model,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: 0,
      status: 'error',
      error_message: error instanceof Error ? error.message : String(error),
      ...context
    });

    // Re-throw error to maintain existing behavior
    throw error;
  }
}
