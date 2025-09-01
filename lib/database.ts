import { Pool } from "pg"

// Database connection pool
let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }
  return pool
}

// Set tenant context for RLS
export async function setTenantContext(tenantId: string) {
  const client = await getPool().connect()
  try {
    await client.query("SELECT set_tenant_context($1)", [tenantId])
  } finally {
    client.release()
  }
}

// Execute query with tenant context
export async function queryWithTenant<T = any>(tenantId: string, text: string, params?: any[]): Promise<T[]> {
  const client = await getPool().connect()
  try {
    await client.query("SELECT set_tenant_context($1)", [tenantId])
    const result = await client.query(text, params)
    return result.rows
  } finally {
    client.release()
  }
}

// Close pool connection
export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}
