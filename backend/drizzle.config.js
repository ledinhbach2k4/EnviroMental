import "dotenv/config";
import { ENV } from "./src/config/env.js";

const databaseUrl = process.env.DATABASE_URL || ENV.DATABASE_URL;

export default {
  schema: "./src/db/schema.js",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
};
