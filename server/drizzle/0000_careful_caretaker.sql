CREATE TYPE "public"."country_code" AS ENUM('AR', 'BR', 'UY', 'PY', 'CL', 'BO', 'PE', 'CO');--> statement-breakpoint
CREATE TYPE "public"."doc_type" AS ENUM('ley', 'decreto', 'reglamento', 'informe', 'acta', 'convenio', 'comunicado', 'minuta', 'dossier');--> statement-breakpoint
CREATE TYPE "public"."relevance" AS ENUM('alta', 'media', 'baja');--> statement-breakpoint
CREATE TYPE "public"."topic" AS ENUM('ambiente', 'integracion-regional', 'corredores-bioceanicos', 'genero', 'educacion', 'salud', 'energia', 'rio-uruguay', 'mercosur', 'rrii', 'seguridad', 'economia-regional');--> statement-breakpoint
CREATE TABLE "ingest_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"ok_sources" integer DEFAULT 0 NOT NULL,
	"failed_sources" integer DEFAULT 0 NOT NULL,
	"items_upserted" integer DEFAULT 0 NOT NULL,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "normas" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"country" "country_code" NOT NULL,
	"topic" "topic" NOT NULL,
	"type" "doc_type" NOT NULL,
	"date" text NOT NULL,
	"relevance" "relevance" NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"source" text NOT NULL,
	"full_text" text,
	"authors" text,
	"status" text,
	"tipo_documento" text,
	"tipo_conteudo" text,
	"keywords" jsonb,
	"source_url" text,
	"pdf_url" text,
	"data_publicacao" text,
	"data_atualizacao" text,
	"api_detail_url" text,
	"comision" text,
	"tramitaciones" jsonb,
	"source_id" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes_state" (
	"operator_email" text PRIMARY KEY NOT NULL,
	"doc" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"email" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cargo" text NOT NULL,
	"pais" "country_code" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "prefs" (
	"operator_email" text PRIMARY KEY NOT NULL,
	"doc" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_state" (
	"operator_email" text PRIMARY KEY NOT NULL,
	"doc" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"country" "country_code" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_ok" boolean,
	"last_count" integer DEFAULT 0 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
ALTER TABLE "notes_state" ADD CONSTRAINT "notes_state_operator_email_operators_email_fk" FOREIGN KEY ("operator_email") REFERENCES "public"."operators"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prefs" ADD CONSTRAINT "prefs_operator_email_operators_email_fk" FOREIGN KEY ("operator_email") REFERENCES "public"."operators"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_state" ADD CONSTRAINT "saved_state_operator_email_operators_email_fk" FOREIGN KEY ("operator_email") REFERENCES "public"."operators"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "normas_country_idx" ON "normas" USING btree ("country");--> statement-breakpoint
CREATE INDEX "normas_topic_idx" ON "normas" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "normas_date_idx" ON "normas" USING btree ("date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "normas_fts_idx" ON "normas" USING gin (to_tsvector('spanish', "title" || ' ' || "excerpt"));