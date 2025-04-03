CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"input" jsonb NOT NULL,
	"output" jsonb NOT NULL,
	"vector" vector(1024) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "responses_vector_cosine_idx" ON "responses" USING hnsw ("vector" vector_cosine_ops);