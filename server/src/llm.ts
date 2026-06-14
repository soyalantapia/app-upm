import Anthropic from '@anthropic-ai/sdk'
import type { Config } from './config.js'

// Capa LLM PLUGGABLE: el asistente no sabe qué proveedor usa. Se elige según la
// key disponible — Anthropic (mejor calidad) tiene prioridad; si no hay, Gemini
// (free tier, para pruebas). Sin ninguna key → null → el asistente responde 503.

export type LlmMessage = { role: 'user' | 'assistant'; content: string }
export type LlmResult = {
  text: string
  usage: { input_tokens: number; output_tokens: number }
  provider: string
}

export interface Llm {
  provider: string
  complete(system: string, messages: LlmMessage[], maxTokens: number): Promise<LlmResult>
}

export function getLlm(config: Config): Llm | null {
  if (config.ANTHROPIC_API_KEY) return anthropicLlm(config.ANTHROPIC_API_KEY)
  if (config.GEMINI_API_KEY) return geminiLlm(config.GEMINI_API_KEY, config.GEMINI_MODEL)
  return null
}

function anthropicLlm(apiKey: string): Llm {
  const client = new Anthropic({ apiKey })
  return {
    provider: 'anthropic:claude-sonnet-4-6',
    async complete(system, messages, maxTokens) {
      const resp = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system,
        messages,
      })
      const text = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n')
      return {
        text,
        usage: { input_tokens: resp.usage.input_tokens, output_tokens: resp.usage.output_tokens },
        provider: 'anthropic:claude-sonnet-4-6',
      }
    },
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function geminiLlm(apiKey: string, model: string): Llm {
  const provider = `gemini:${model}`
  return {
    provider,
    async complete(system, messages, maxTokens) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
      const body = {
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.3,
          // thinkingBudget:0 desactiva el "thinking" de los modelos 2.5 → más
          // rápido y barato (no gasta tokens de razonamiento) para resumir+citar.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }
      // El free tier devuelve 429 (RESOURCE_EXHAUSTED) de forma intermitente y
      // 503 cuando el modelo está saturado. Reintentamos con backoff para que el
      // uso normal (1 pregunta cada varios seg) sea confiable. Respeta retryDelay
      // si Gemini lo sugiere. Tras agotar reintentos, lanza → ruta 502 → front mock.
      let res!: Response
      const BACKOFF = [1500, 4000]
      for (let attempt = 0; ; attempt++) {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(body),
        })
        if (res.ok) break
        const retriable = res.status === 429 || res.status === 503 || res.status === 500
        if (!retriable || attempt >= BACKOFF.length) {
          throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 300)}`)
        }
        await sleep(BACKOFF[attempt])
      }
      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
      }
      const text = (json.candidates?.[0]?.content?.parts ?? []).map(p => p.text ?? '').join('')
      const um = json.usageMetadata ?? {}
      return {
        text,
        usage: {
          input_tokens: um.promptTokenCount ?? 0,
          output_tokens: um.candidatesTokenCount ?? 0,
        },
        provider,
      }
    },
  }
}
