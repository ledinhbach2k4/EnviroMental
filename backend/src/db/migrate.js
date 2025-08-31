import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function runMigrations() {
  try {
    console.log('Starting database migration...');
    await migrate(db, { migrationsFolder: 'backend/src/db/migrations' });
    console.log('Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error running database migration:', error);
    process.exit(1);
  }
}

runMigrations();
