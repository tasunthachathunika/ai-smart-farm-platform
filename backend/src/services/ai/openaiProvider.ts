import { LLMProvider, CompletionOptions, CompletionResult } from './provider.interface';
import { logger } from '../../utils/logger';

export class OpenAILLMProvider implements LLMProvider {
  public readonly name = 'openai';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
  }

  public async generateCompletion(options: CompletionOptions): Promise<CompletionResult> {
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, options.timeoutMs || 15000);

    const body: Record<string, unknown> = {
      model: this.model,
      temperature: options.temperature ?? 0.2,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
      ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, errorText }, 'OpenAI API call failed');
        throw new Error(`OpenAI API returned status ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };

      const content = data.choices?.[0]?.message?.content || '';
      const promptTokens = data.usage?.prompt_tokens || 0;
      const completionTokens = data.usage?.completion_tokens || 0;
      const totalTokens = data.usage?.total_tokens || promptTokens + completionTokens;

      return {
        content,
        promptTokens,
        completionTokens,
        totalTokens,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
