import pg from 'pg';

/**
 * Thin wrapper around a pg pool (or, inside a transaction, a single client).
 * Repositories only depend on `query()` and `transaction()`.
 */
export class Database {
  constructor(executor, pool = executor) {
    this.executor = executor;
    this.pool = pool;
  }

  static connect(connectionString) {
    return new Database(new pg.Pool({ connectionString }));
  }

  get inTransaction() {
    return this.executor !== this.pool;
  }

  query(text, params = []) {
    return this.executor.query(text, params);
  }

  /** Runs fn(txDatabase) in a transaction; nested calls reuse the outer transaction. */
  async transaction(fn) {
    if (this.inTransaction) return fn(this);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(new Database(client, this.pool));
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  end() {
    return this.pool.end();
  }
}
