import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type { Mode, Program } from "./model";
import { ClubError } from "./model";

export type DB = Pick<PoolClient, "query">;
let pool: Pool | undefined;
export function database(): Pool {
  // Deliberately never fall back to the storefront's legacy remote database URL.
  const connectionString = process.env.GRIM_DATABASE_URL;
  if (!connectionString) throw new ClubError("storage_unavailable", 503);
  pool ??= new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  });
  return pool;
}
export async function one<T extends QueryResultRow>(
  db: DB,
  sql: string,
  values: unknown[] = [],
): Promise<T | undefined> {
  return (await db.query<T>(sql, values)).rows[0];
}
export async function transaction<T>(
  pool: Pool,
  work: (db: PoolClient) => Promise<T>,
): Promise<T> {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("SET LOCAL lock_timeout = '15s'");
    const result = await work(db);
    await db.query("COMMIT");
    return result;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
export async function lockedProgram(db: DB, mode: Mode): Promise<Program> {
  const p = await one<Program>(
    db,
    "SELECT * FROM grim.program WHERE id=$1 FOR UPDATE",
    [mode],
  );
  if (!p) throw new ClubError("not_configured", 503);
  return p;
}
