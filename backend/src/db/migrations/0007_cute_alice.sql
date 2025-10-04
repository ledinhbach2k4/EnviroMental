ALTER TABLE "habits" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "icon" text DEFAULT 'walk-outline';