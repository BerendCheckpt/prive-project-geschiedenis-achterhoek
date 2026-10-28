import { readdir, readFile } from 'node:fs/promises';
import { Database } from './Database.js';
import { Repository } from './repositories/Repository.js';

const MIGRATIONS_DIR = new URL('./migrations/', import.meta.url);
const LOCK_ID = 73510001; // advisory lock so parallel app instances don't migrate at the same time
const SCHEMA_MIGRATIONS = { table: 'schema_migrations', columns: ['name', 'applied_at'], key: 'name' };

/** Applies migrations/*.sql files that have not run yet, in file-name order. */
export class Migrator {
  /** @param {Database} db */
  constructor(db, { log = console.log } = {}) {
    this.db = db;
    this.log = log;
  }

  async run() {
    const client = await this.db.pool.connect();
    const conn = new Database(client, this.db.pool);
    try {
      await conn.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
      await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
      const applied = new Repository(conn, SCHEMA_MIGRATIONS);
      const done = new Set((await applied.findAll()).map((m) => m.name));
      const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
      for (const file of files.filter((f) => !done.has(f))) {
        const sql = await readFile(new URL(file, MIGRATIONS_DIR), 'utf8');
        await conn.query('BEGIN');
        try {
          await conn.query(sql);
          await applied.insert({ name: file });
          await conn.query('COMMIT');
          this.log(`migratie toegepast: ${file}`);
        } catch (err) {
          await conn.query('ROLLBACK');
          throw err;
        }
      }
    } finally {
      await conn.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
      client.release();
    }
  }
}
