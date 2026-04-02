import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/mtfs_dev'
});

export async function query(text: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function withTenant<T>(tenantId: string, callback: (client: import('pg').PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);
    return await callback(client);
  } finally {
    client.release();
  }
}
