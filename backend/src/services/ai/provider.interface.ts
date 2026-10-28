export interface CompletionOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  timeoutMs?: number;
  jsonMode?: boolean;
}

export interface CompletionResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Pluggable LLM Provider abstraction for testing, local execution, and production providers.
 */
export interface LLMProvider {
  readonly name: string;
  generateCompletion(options: CompletionOptions): Promise<CompletionResult>;
}
