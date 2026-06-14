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

// Cadena de modelos para FALLBACK. El free tier de Gemini limita por
// REQUESTS/DÍA POR MODELO (cada modelo tiene su balde propio): si el primario
// se agota (429), rotamos al siguiente que tenga cupo. Esto multiplica el cupo
// gratis sin pagar nada. El primario se elige por GEMINI_MODEL.
function modelChain(primary: string): string[] {
  const fallbacks = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.0-flash-lite']
  return [...new Set([primary, ...fallbacks])]
}

async function callGemini(model: string, apiKey: string, system: string, messages: LlmMessage[], maxTokens: number): Promise<Response> {
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
      // thinkingBudget:0 desactiva el "thinking" de los 2.5 → más rápido y barato.
      thinkingConfig: { thinkingBudget: 0 },
    },
  }
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  })
}

function geminiLlm(apiKey: string, primaryModel: string): Llm {
  const chain = modelChain(primaryModel)
  return {
    provider: `gemini:${primaryModel}`,
    async complete(system, messages, maxTokens) {
      let lastDetail = ''
      // Ronda 1: rotar por todos los modelos (cada 429/503 → siguiente al toque).
      // Ronda 2: un único backoff sobre el primario por si fue per-minuto pasajero.
      for (let round = 0; round < 2; round++) {
        for (const model of chain) {
          const res = await callGemini(model, apiKey, system, messages, maxTokens)
          if (res.ok) {
            const json = (await res.json()) as {
              candidates?: { content?: { parts?: { text?: string }[] } }[]
              usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
            }
            const text = (json.candidates?.[0]?.content?.parts ?? []).map(p => p.text ?? '').join('')
            const um = json.usageMetadata ?? {}
            return {
              text,
              usage: { input_tokens: um.promptTokenCount ?? 0, output_tokens: um.candidatesTokenCount ?? 0 },
              provider: `gemini:${model}`,
            }
          }
          lastDetail = `gemini ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`
          // 429/503 → probar el próximo modelo. Otro error → cortar (no es de cupo).
          if (res.status !== 429 && res.status !== 503 && res.status !== 500) {
            throw new Error(lastDetail)
          }
          if (round === 1) break // en la 2da ronda solo reintentamos el primario
        }
        if (round === 0) await sleep(3000)
      }
      throw new Error(`todos los modelos Gemini sin cupo. último: ${lastDetail}`)
    },
  }
}
