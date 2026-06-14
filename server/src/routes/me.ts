import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db/client.js'
import { notesState, operators, prefs, savedState } from '../db/schema.js'
import { requireAuth } from '../plugins/auth.js'
import { COUNTRY_CODES, TOPICS } from '../types.js'

// Sync de estado de usuario: documento completo, last-write-wins (espeja localStorage).

const PrefsDoc = z.object({
  countries: z.array(z.enum(COUNTRY_CODES)),
  topics: z.array(z.enum(TOPICS)),
  frequency: z.enum(['diario', 'semanal', 'alertas']),
  language: z.enum(['es', 'pt']),
  notifications: z.boolean(),
})

const SavedDoc = z.object({
  saved: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['novedad', 'documento', 'respuesta', 'minuta', 'brief']),
      title: z.string(),
      ref: z.string().optional(),
      body: z.string().optional(),
      meta: z.record(z.unknown()).optional(),
      folderId: z.string().optional(),
      savedAt: z.union([z.string(), z.number()]).optional(),
    }).passthrough(),
  ),
  folders: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      itemCount: z.number(),
      description: z.string().optional(),
    }).passthrough(),
  ),
})

const NotesDoc = z.object({
  notes: z.array(
    z.object({
      id: z.string(),
      itemId: z.string(),
      text: z.string(),
      tags: z.array(z.string()),
      createdAt: z.number(),
      updatedAt: z.number(),
    }).passthrough(),
  ),
})

export function meRoutes(app: FastifyInstance, db: Db, jwtSecret: string) {
  const auth = requireAuth(jwtSecret)

  app.get('/me', { preHandler: auth }, async (req, reply) => {
    const [op] = await db.select().from(operators).where(eq(operators.email, req.operatorEmail!))
    if (!op) return reply.code(404).send({ error: 'not found' })
    return {
      email: op.email,
      name: op.name,
      cargo: op.cargo,
      pais: op.pais,
      loggedAt: (op.lastLoginAt ?? op.createdAt ?? new Date()).toISOString(),
    }
  })

  // GET/PUT genéricos para los 3 documentos jsonb
  const docs = [
    { path: '/me/prefs', table: prefs, schema: PrefsDoc },
    { path: '/me/saved', table: savedState, schema: SavedDoc },
    { path: '/me/notes', table: notesState, schema: NotesDoc },
  ] as const

  for (const { path, table, schema } of docs) {
    app.get(path, { preHandler: auth }, async (req, reply) => {
      const [row] = await db.select().from(table).where(eq(table.operatorEmail, req.operatorEmail!))
      if (!row) return reply.code(404).send({ error: 'not found' })
      return row.doc
    })

    app.put(path, { preHandler: auth }, async (req, reply) => {
      const parsed = schema.safeParse(req.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid body', details: parsed.error.issues })
      }
      const email = req.operatorEmail!
      // El operator puede no existir aún si el login fue en otro dispositivo: upsert defensivo.
      await db
        .insert(operators)
        .values({ email, name: 'Legislador', cargo: 'Legislador', pais: 'UY' })
        .onConflictDoNothing()
      await db
        .insert(table)
        .values({ operatorEmail: email, doc: parsed.data, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: table.operatorEmail,
          set: { doc: parsed.data, updatedAt: new Date() },
        })
      return parsed.data
    })
  }
}
