CREATE TABLE IF NOT EXISTS "community_forum_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"author_name" text NOT NULL,
	"author_color" text NOT NULL,
	"reply_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"has_image" boolean DEFAULT false,
	'image_url' text
);
