/**
 * OpenAI Wrapper mit automatischem Usage-Tracking
 * Wrappt alle OpenAI-Calls und trackt automatisch Token-Usage
 */

import { openai } from './openai';
import { auth } from '@/auth';
import { trackUsage, checkUsageLimit, type UsageLimit, type TokenUsage } from './usage-tracking';

type ChatCompletionOptions = Parameters<typeof openai.chat.completions.create>[0];

/**
 * Wrapper für chat.completions.create mit automatischem Tracking
 */
export async function createChatCompletion(
  options: ChatCompletionOptions,
  toolId: string,
  toolName: string,
  limits?: UsageLimit
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Nicht authentifiziert');
  }

  // Prüfe Limits (falls konfiguriert)
  if (limits) {
    const limitCheck = await checkUsageLimit(session.user.id, toolId, limits);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.reason || 'Usage-Limit erreicht');
    }
  }

  // Führe den API-Call aus
  const response = await openai.chat.completions.create(options);

  // Tracke Usage (async, blockiert nicht)
  if (response.usage) {
    const usage: TokenUsage = {
      promptTokens: response.usage.prompt_tokens || 0,
      completionTokens: response.usage.completion_tokens || 0,
      totalTokens: response.usage.total_tokens || 0,
    };

    const model = options.model || 'gpt-4o-mini';
    
    // Tracke im Hintergrund (nicht blockierend)
    trackUsage(
      session.user.id,
      toolId,
      toolName,
      model,
      usage
    ).catch(err => {
      console.error('[USAGE] Fehler beim Tracking:', err);
    });
  }

  return response;
}

/**
 * Wrapper für andere OpenAI-Calls (falls nötig)
 * Für jetzt fokussieren wir uns auf chat.completions
 */
export { openai };
