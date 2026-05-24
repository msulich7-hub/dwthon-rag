import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { analyzeSentiment, type SentimentAnalysis } from './sentiment'

export type SentimentAnalyzeOptions = {
  preferLlm?: boolean
}

const LLM_SCHEMA_HINT = `Return JSON only: {"label":"positive"|"neutral"|"negative"|"frustrated","score":number,"confidence":0-1,"signals":string[],"atRisk":boolean}`

/**
 * Heuristic sentiment by default; optional LLM pass when OM_AI_MODEL is configured.
 */
export async function analyzeSentimentSmart(
  text: string,
  options?: SentimentAnalyzeOptions,
): Promise<SentimentAnalysis & { engine: 'heuristic' | 'llm' }> {
  const heuristic = analyzeSentiment(text)
  const preferLlm = options?.preferLlm !== false
  const modelId = process.env.OM_AI_MODEL?.trim()
  const apiKey = process.env.OPENAI_API_KEY?.trim() || process.env.OM_AI_OPENAI_API_KEY?.trim()

  if (!preferLlm || !modelId || !apiKey || text.trim().length < 8) {
    return { ...heuristic, engine: 'heuristic' }
  }

  try {
    const openai = createOpenAI({ apiKey })
    const { text: raw } = await generateText({
      model: openai(modelId),
      prompt: `Analyze sales communication sentiment.\n${LLM_SCHEMA_HINT}\n\nText:\n${text.slice(0, 8000)}`,
      maxOutputTokens: 256,
    })

    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      return { ...heuristic, engine: 'heuristic' }
    }

    const parsed = JSON.parse(match[0]) as Partial<SentimentAnalysis>
    const label = parsed.label ?? heuristic.label
    const score = typeof parsed.score === 'number' ? parsed.score : heuristic.score
    const confidence =
      typeof parsed.confidence === 'number' ? parsed.confidence : heuristic.confidence
    const signals = Array.isArray(parsed.signals) ? parsed.signals.map(String) : heuristic.signals
    const atRisk = typeof parsed.atRisk === 'boolean' ? parsed.atRisk : heuristic.atRisk

    return { label, score, confidence, signals, atRisk, engine: 'llm' }
  } catch {
    return { ...heuristic, engine: 'heuristic' }
  }
}
