ALTER TABLE "responses" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "tags" text[];