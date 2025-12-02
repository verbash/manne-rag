import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Please check your .env file."
  );
}

// Validate DATABASE_URL format
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
  throw new Error("DATABASE_URL must start with postgresql:// or postgres://");
}

export const pool = new Pool({
  connectionString: dbUrl,
});

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      embedding vector(768),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS documents_embedding_idx
    ON documents USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100)
  `);
}
