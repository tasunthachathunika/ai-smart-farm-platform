import { LLMProvider, CompletionOptions, CompletionResult } from './provider.interface';

export class MockLLMProvider implements LLMProvider {
  public readonly name = 'mock-llm';

  // Customizable response handler or static response
  public mockResponse?: string;
  public mockDelayMs = 0;
  public shouldTimeout = false;
  public shouldError = false;
  public errorMessage = 'Mock LLM generation failure';
  public callCount = 0;
  public lastOptions?: CompletionOptions;

  public reset(): void {
    this.mockResponse = undefined;
    this.mockDelayMs = 0;
    this.shouldTimeout = false;
    this.shouldError = false;
    this.errorMessage = 'Mock LLM generation failure';
    this.callCount = 0;
    this.lastOptions = undefined;
  }

  public async generateCompletion(options: CompletionOptions): Promise<CompletionResult> {
    this.callCount++;
    this.lastOptions = options;

    if (this.mockDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.mockDelayMs));
    }

    if (this.shouldTimeout) {
      const timeoutError = new Error('The operation was aborted');
      timeoutError.name = 'AbortError';
      throw timeoutError;
    }

    if (this.shouldError) {
      throw new Error(this.errorMessage);
    }

    if (this.mockResponse !== undefined) {
      return {
        content: this.mockResponse,
        promptTokens: 120,
        completionTokens: 80,
        totalTokens: 200,
      };
    }

    // Default dynamic mock response tailored to summary or visit-prep
    if (options.systemPrompt.includes('visit_prep') || options.systemPrompt.includes('"purpose"') || options.userPrompt.includes('visit-prep')) {
      const defaultVisitPrep = {
        purpose: 'Comprehensive plot inspection and review of recorded crop cycle progress.',
        timelineSummary:
          'Recent activities include vegetative maintenance and routine field observations.',
        keyIssues: [
          {
            issue: 'Observation of mild yellowing noted in recent logs.',
            sourceRecordIds: [],
            suggestedAction: 'Inspect leaf undersides with extension officer.',
          },
        ],
        discussionQuestions: [
          'What irrigation frequency was maintained over the past fortnight?',
          'Are there any localized pest signs on neighboring fields?',
        ],
        inspectionsRecommended: ['Leaf canopy inspection', 'Soil moisture level check'],
      };
      return {
        content: JSON.stringify(defaultVisitPrep),
        promptTokens: 150,
        completionTokens: 110,
        totalTokens: 260,
      };
    }

    // Default summary
    const defaultSummary = {
      summary: 'Crop cycle is progressing through standard growth stages with consistent records.',
      keyObservations: [
        {
          observation: 'Field activities recorded on schedule.',
          sourceRecordIds: [],
        },
      ],
      suggestedOfficerQuestions: [
        'How do current crop growth rates compare with district seasonal baselines?',
        'What soil condition checks should be scheduled prior to the next crop cycle phase?',
      ],
      dataGaps: ['No recent soil moisture logs recorded for the past week.'],
    };

    return {
      content: JSON.stringify(defaultSummary),
      promptTokens: 140,
      completionTokens: 90,
      totalTokens: 230,
    };
  }
}

export const mockLLMProvider = new MockLLMProvider();
