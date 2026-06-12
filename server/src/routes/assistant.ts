import type { FastifyInstance } from 'fastify'
import Anthropic from '@anthropic-ai/sdk'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db/client.js'
import { normas } from '../db/schema.js'

const SYSTEM_PROMPT =
  'Sos el asistente legislativo de App UPM para legisladores latinoamericanos. ' +
  'Respondés en español, en markdown estructurado, citando EXCLUSIVAMENTE las normas ' +
  'provistas en el contexto (id, título, país, fecha). Si el contexto no alcanza, ' +
  'lo decís explícitamente. Nunca inventás normas.'

const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  sources: z.array(z.object({ id: z.string(), title: z.string(), type: z.string() })).optional(),
  isInstitutional: z.boolean().optional(),
  createdAt: z.string().optional(),
})

const Body = z.object({
  messages: z.array(MessageSchema).min(1),
})

export function assistantRoutes(app: FastifyInstance, db: Db, anthropicKey: string | undefined) {
  app.post('/assistant', async (req, reply) => {
    if (!anthropicKey) {
      return reply.code(503).send({ error: 'assistant unavailable' })
    }
    const parsed = Body.safeParse(req.body)
    if (!parsed.success || parsed.data.messages.at(-1)?.role !== 'user') {
      return reply.code(400).send({ error: 'invalid body' })
    }
    const messages = parsed.data.messages
    const question = messages.at(-1)!.content

    // RAG: top-8 normas relevantes vía FTS sobre la pregunta.
    const tsv = sql`to_tsvector('spanish', ${normas.title} || ' ' || ${normas.excerpt} || ' ' || coalesce(${normas.fullText}, ''))`
    const tsq = sql`plainto_tsquery('spanish', ${question})`
    let context = await db
      .select()
      .from(normas)
      .where(sql`${tsv} @@ ${tsq}`)
      .orderBy(sql`ts_rank(${tsv}, ${tsq}) DESC`)
      .limit(8)
    if (context.length === 0) {
      // Sin match FTS: dar igual algo de contexto reciente para no responder en vacío.
      context = await db.select().from(normas).orderBy(sql`${normas.date} DESC`).limit(8)
    }

    const contextBlock = context
      .map(
        n =>
          `[${n.id}] ${n.title}\nPaís: ${n.country} · Tipo: ${n.type} · Fecha: ${n.date} · Tema: ${n.topic}\n${n.excerpt}`,
      )
      .join('\n\n---\n\n')

    try {
      const client = new Anthropic({ apiKey: anthropicKey })
      const resp = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: `${SYSTEM_PROMPT}\n\n## Normas disponibles (contexto)\n\n${contextBlock}`,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      })
      const content = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n')

      // sources: normas del contexto que el modelo efectivamente citó (por id)
      const cited = context.filter(n => content.includes(n.id))
      const sourcesOut = (cited.length > 0 ? cited : context.slice(0, 3)).map(n => ({
        id: n.id,
        title: n.title,
        type: n.type,
      }))

      return {
        message: {
          id: 'a-' + Math.random().toString(36).slice(2, 10),
          role: 'assistant',
          content,
          sources: sourcesOut,
          createdAt: new Date().toISOString(),
        },
        usage: { input_tokens: resp.usage.input_tokens, output_tokens: resp.usage.output_tokens },
      }
    } catch (err) {
      req.log.error({ err }, 'anthropic call failed')
      return reply.code(502).send({ error: 'assistant upstream error' })
    }
  })
}
