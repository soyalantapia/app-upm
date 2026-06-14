import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// Inline (drizzle-kit CJS no resuelve imports ESM .js): mantener EN SINCRONÍA
// con src/types.ts — hay un test unitario que falla si divergen.
const COUNTRY_CODES = ['AR', 'BR', 'UY', 'PY', 'CL', 'BO', 'PE', 'CO'] as const
const TOPICS = [
  'ambiente', 'integracion-regional', 'corredores-bioceanicos', 'genero',
  'educacion', 'salud', 'energia', 'rio-uruguay', 'mercosur', 'rrii',
  'seguridad', 'economia-regional',
] as const
const DOC_TYPES = [
  'ley', 'decreto', 'reglamento', 'informe', 'acta', 'convenio',
  'comunicado', 'minuta', 'dossier',
] as const
const RELEVANCES = ['alta', 'media', 'baja'] as const

export const countryCode = pgEnum('country_code', COUNTRY_CODES)
export const topic = pgEnum('topic', TOPICS)
export const docType = pgEnum('doc_type', DOC_TYPES)
export const relevance = pgEnum('relevance', RELEVANCES)

export const normas = pgTable(
  'normas',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    country: countryCode('country').notNull(),
    topic: topic('topic').notNull(),
    type: docType('type').notNull(),
    date: text('date').notNull(), // ISO string tal cual — el front ordena con localeCompare
    relevance: relevance('relevance').notNull(),
    excerpt: text('excerpt').notNull().default(''),
    source: text('source').notNull(),
    fullText: text('full_text'),
    authors: text('authors'),
    status: text('status'),
    tipoDocumento: text('tipo_documento'),
    tipoConteudo: text('tipo_conteudo'),
    keywords: jsonb('keywords').$type<string[]>(),
    sourceUrl: text('source_url'),
    pdfUrl: text('pdf_url'),
    dataPublicacao: text('data_publicacao'),
    dataAtualizacao: text('data_atualizacao'),
    apiDetailUrl: text('api_detail_url'),
    comision: text('comision'),
    tramitaciones: jsonb('tramitaciones').$type<
      { fecha: string; descripcion: string; organo?: string; despacho?: string }[]
    >(),
    sourceId: text('source_id').notNull(),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    index('normas_country_idx').on(t.country),
    index('normas_topic_idx').on(t.topic),
    index('normas_date_idx').on(t.date.desc()),
    index('normas_fts_idx').using(
      'gin',
      sql`to_tsvector('spanish', ${t.title} || ' ' || ${t.excerpt})`,
    ),
  ],
)

export const sources = pgTable('sources', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  country: countryCode('country').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  lastOk: boolean('last_ok'),
  lastCount: integer('last_count').notNull().default(0),
  lastError: text('last_error'),
})

export const ingestRuns = pgTable('ingest_runs', {
  id: serial('id').primaryKey(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  okSources: integer('ok_sources').notNull().default(0),
  failedSources: integer('failed_sources').notNull().default(0),
  itemsUpserted: integer('items_upserted').notNull().default(0),
  detail: jsonb('detail'),
})

export const operators = pgTable('operators', {
  email: text('email').primaryKey(),
  name: text('name').notNull(),
  cargo: text('cargo').notNull(),
  pais: countryCode('pais').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
})

export const prefs = pgTable('prefs', {
  operatorEmail: text('operator_email').primaryKey().references(() => operators.email),
  doc: jsonb('doc').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const savedState = pgTable('saved_state', {
  operatorEmail: text('operator_email').primaryKey().references(() => operators.email),
  doc: jsonb('doc').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const notesState = pgTable('notes_state', {
  operatorEmail: text('operator_email').primaryKey().references(() => operators.email),
  doc: jsonb('doc').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
