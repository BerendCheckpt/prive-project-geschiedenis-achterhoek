import { Repository } from './Repository.js';
import { USERS } from './schemas.js';

export class UserRepository extends Repository {
  constructor(db) {
    super(db, USERS);
  }

  /** Case-insensitive lookup by username or e-mail. */
  async findByLogin(name) {
    const { rows } = await this.db.query(
      'SELECT * FROM users WHERE lower(username) = lower($1) OR lower(email) = lower($1) LIMIT 1', [name],
    );
    return rows[0] ?? null;
  }
}
