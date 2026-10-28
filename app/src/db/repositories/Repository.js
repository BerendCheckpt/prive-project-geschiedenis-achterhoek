import { SqlParams } from '../SqlParams.js';

/**
 * Generic table repository: one method per database action, taking and returning plain objects.
 *
 * `where` objects map column → value: a value matches with `=`, an array with `= ANY(...)`,
 * and null with `IS NULL`. Column names are checked against the schema, so only values
 * (never identifiers from input) reach the SQL as parameters.
 *
 * Subclass only for queries this base cannot express (joins, aggregates, search).
 */
export class Repository {
  /**
   * @param {import('../Database.js').Database} db
   * @param {{ table: string, columns: string[], key?: string }} schema
   */
  constructor(db, { table, columns, key = 'id' }) {
    this.db = db;
    this.table = table;
    this.columns = columns;
    this.key = key;
  }

  /** Same repository bound to another Database (e.g. a transaction). */
  withDb(db) {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this, { db });
  }

  async findAll(where = {}, { orderBy = [], limit } = {}) {
    const params = new SqlParams();
    const { rows } = await this.db.query(
      `SELECT * FROM ${this.tableSql}${this.whereSql(where, params)}${this.orderSql(orderBy)}`
        + (limit ? ` LIMIT ${params.add(limit)}` : ''),
      params.values,
    );
    return rows;
  }

  async findOne(where) {
    return (await this.findAll(where, { limit: 1 }))[0] ?? null;
  }

  findById(id) {
    return this.findOne({ [this.key]: id });
  }

  async count(where = {}) {
    const params = new SqlParams();
    const { rows } = await this.db.query(
      `SELECT count(*)::int AS n FROM ${this.tableSql}${this.whereSql(where, params)}`, params.values,
    );
    return rows[0].n;
  }

  async exists(where) {
    return (await this.count(where)) > 0;
  }

  async insert(data, options) {
    return (await this.insertMany([data], options))[0] ?? null;
  }

  /** Inserts rows that share the same keys. `ignoreConflicts` skips rows violating a unique key. */
  async insertMany(rows, { ignoreConflicts = false } = {}) {
    if (!rows.length) return [];
    const cols = this.definedColumns(rows[0]);
    const params = new SqlParams();
    const values = rows.map((row) => `(${cols.map((c) => params.add(row[c])).join(', ')})`).join(', ');
    const { rows: inserted } = await this.db.query(
      `INSERT INTO ${this.tableSql} (${cols.map((c) => this.col(c)).join(', ')}) VALUES ${values}`
        + `${ignoreConflicts ? ' ON CONFLICT DO NOTHING' : ''} RETURNING *`,
      params.values,
    );
    return inserted;
  }

  /** Inserts, or updates the other columns when `conflictColumns` already exist. */
  async upsert(data, conflictColumns = [this.key]) {
    const cols = this.definedColumns(data);
    const params = new SqlParams();
    const updates = cols.filter((c) => !conflictColumns.includes(c)).map((c) => `${this.col(c)} = EXCLUDED.${this.col(c)}`);
    const { rows } = await this.db.query(
      `INSERT INTO ${this.tableSql} (${cols.map((c) => this.col(c)).join(', ')})
       VALUES (${cols.map((c) => params.add(data[c])).join(', ')})
       ON CONFLICT (${conflictColumns.map((c) => this.col(c)).join(', ')})
       ${updates.length ? `DO UPDATE SET ${updates.join(', ')}` : 'DO NOTHING'} RETURNING *`,
      params.values,
    );
    return rows[0] ?? null;
  }

  async update(where, data) {
    const cols = this.definedColumns(data);
    if (!cols.length) return this.findAll(where);
    const params = new SqlParams();
    const set = cols.map((c) => `${this.col(c)} = ${params.add(data[c])}`).join(', ');
    const { rows } = await this.db.query(
      `UPDATE ${this.tableSql} SET ${set}${this.whereSql(this.requireWhere(where), params)} RETURNING *`, params.values,
    );
    return rows;
  }

  async updateById(id, data) {
    return (await this.update({ [this.key]: id }, data))[0] ?? null;
  }

  /** Returns the number of deleted rows. Refuses an empty `where` (would delete everything). */
  async delete(where) {
    const params = new SqlParams();
    const { rowCount } = await this.db.query(
      `DELETE FROM ${this.tableSql}${this.whereSql(this.requireWhere(where), params)}`, params.values,
    );
    return rowCount;
  }

  deleteById(id) {
    return this.delete({ [this.key]: id });
  }

  // --- SQL helpers, also used by subclasses ---

  get tableSql() {
    return `"${this.table}"`;
  }

  col(name) {
    if (!this.columns.includes(name)) throw new Error(`Onbekende kolom ${this.table}.${name}`);
    return `"${name}"`;
  }

  definedColumns(data) {
    return Object.keys(data).filter((k) => data[k] !== undefined).map((k) => (this.col(k), k));
  }

  requireWhere(where) {
    if (!Object.keys(where).length) throw new Error(`Lege where-clausule op ${this.table}`);
    return where;
  }

  whereSql(where, params, alias) {
    const prefix = alias ? `${alias}.` : '';
    const parts = Object.entries(where).map(([c, v]) => {
      const column = prefix + this.col(c);
      if (v === null) return `${column} IS NULL`;
      if (Array.isArray(v)) return `${column} = ANY(${params.add(v)})`;
      return `${column} = ${params.add(v)}`;
    });
    return parts.length ? ` WHERE ${parts.join(' AND ')}` : '';
  }

  /** orderBy: column names, prefix with '-' for descending. */
  orderSql(orderBy) {
    const list = [].concat(orderBy);
    if (!list.length) return '';
    return ` ORDER BY ${list.map((o) => (o.startsWith('-') ? `${this.col(o.slice(1))} DESC` : this.col(o))).join(', ')}`;
  }
}
