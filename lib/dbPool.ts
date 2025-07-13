import { Pool, PoolClient } from "pg";

// Supabase already provides connection pooling, so we'll use their URL
const connectionString =
  process.env.PG_CONNECTION_POOLER_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Database connection string is not configured");
}

const pool = new Pool({
  connectionString,
  max: 2, // Reduced from 3 since we're also using Prisma
  min: 0,
  idleTimeoutMillis: 1000, // Reduced from 3000 - close idle connections faster
  connectionTimeoutMillis: 2000, // Reduced from 3000 - fail faster
  allowExitOnIdle: true,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase connections
  },
});

// Log pool events for better debugging
pool.on("connect", () => {
  console.log("[Pool] New client connected");
});

pool.on("error", (err) => {
  console.error("[Pool] Unexpected error on idle client", err);
});

pool.on("remove", () => {
  console.log("[Pool] Client removed from pool");
});

// Add additional monitoring
pool.on("acquire", () => {
  console.log("[Pool] Client acquired from pool");
});

// Cleanup function
const cleanup = async () => {
  try {
    await pool.end();
    console.log("[Pool] All connections closed");
  } catch (err) {
    console.error("[Pool] Error during cleanup:", err);
  }
};

// Handle cleanup on app termination
process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);
process.on("beforeExit", cleanup);

// Export a wrapper function to handle retries
export async function withRetry<T>(
  operation: (client: PoolClient) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        return await operation(client);
      } finally {
        client.release();
      }
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = Math.min(100 * Math.pow(2, attempt), 1000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        console.log(
          `[Pool] Retrying operation, attempt ${attempt + 1} of ${maxRetries}`
        );
        continue;
      }
      break;
    }
  }
  throw lastError;
}

export default pool;