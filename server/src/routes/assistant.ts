import type { FastifyInstance } from 'fastify'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db/client.js'
import { normas } from '../db/schema.js'
import type { Llm } from '../llm.js'

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

export function assistantRoutes(app: FastifyInstance, db: Db, llm: Llm | null) {
  app.post('/assistant', async (req, reply) => {
    if (!llm) {
      return reply.code(503).send({ error: 'assistant unavailable' })
    }
    const parsed = Body.safeParse(req.body)
    if (!parsed.success || parsed.data.messages.at(-1)?.role !== 'user') {
      return reply.code(400).send({ error: 'invalid body' })
    }
    const messages = parsed.data.messages
    const question = messages.at(-1)!.content

    // RAG: top-8 normas relevantes vía búsqueda HÍBRIDA (semántica + FTS).
    const { hybridSearch } = await import('../search.js')
    let context = (await hybridSearch(db, question, 8)).items
    if (context.length === 0) {
      // Sin match: dar contexto reciente para no responder en vacío.
      const recent = await db.select().from(normas).orderBy(sql`${normas.date} DESC`).limit(8)
      const { rowToItem } = await import('./feed.js')
      context = recent.map(rowToItem)
    }

    const contextBlock = context
      .map(
        n =>
          `[${n.id}] ${n.title}\nPaís: ${n.country} · Tipo: ${n.type} · Fecha: ${n.date} · Tema: ${n.topic}\n${n.excerpt}`,
      )
      .join('\n\n---\n\n')

    try {
      const result = await llm.complete(
        `${SYSTEM_PROMPT}\n\n## Normas disponibles (contexto)\n\n${contextBlock}`,
        messages.map(m => ({ role: m.role, content: m.content })),
        1500,
      )
      const content = result.text

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
        usage: result.usage,
        provider: result.provider,
      }
    } catch (err) {
      req.log.error({ err }, `llm call failed (${llm.provider})`)
      return reply.code(502).send({ error: 'assistant upstream error' })
    }
  })
}
