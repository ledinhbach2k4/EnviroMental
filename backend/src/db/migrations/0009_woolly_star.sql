ALTER TABLE "habits" ADD COLUMN "completion_history" json DEFAULT '[]'::json;
