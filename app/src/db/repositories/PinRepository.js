import { Repository } from './Repository.js';
import { PINS } from './schemas.js';
import { SqlParams } from '../SqlParams.js';

/** First image of a pin, used as thumbnail in lists. */
export const THUMBNAIL_SQL = (p) => `(SELECT m.file_name FROM media m WHERE m.pin_id = ${p}.id AND m.kind = 'image'
  ORDER BY m.sort_order, m.id LIMIT 1)`;

export class PinRepository extends Repository {
  constructor(db) {
    super(db, PINS);
  }

  /**
   * @param {import('./PinCriteria.js').PinCriteria} criteria
   * @param {{ favoritesOf?: number|null }} options adds is_favorite for this user
   */
  async search(criteria, { favoritesOf = null, limit = 2000 } = {}) {
    const params = new SqlParams();
    const where = criteria.conditions(params, 'p');
    const isFavorite = favoritesOf
      ? `EXISTS (SELECT 1 FROM favorites f WHERE f.pin_id = p.id AND f.user_id = ${params.add(favoritesOf)})`
      : 'false';
    const { rows } = await this.db.query(
      `SELECT p.id, p.owner_id, p.title, p.summary, p.lat, p.lon, p.place_name, p.year_start, p.year_end,
              p.published, p.updated_at,
              coalesce((SELECT array_agg(pc.category_id) FROM pin_categories pc WHERE pc.pin_id = p.id), '{}') AS category_ids,
              ${THUMBNAIL_SQL('p')} AS thumbnail,
              ${isFavorite} AS is_favorite
       FROM pins p
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY p.year_start NULLS LAST, p.title
       LIMIT ${params.add(limit)}`,
      params.values,
    );
    return rows;
  }

  async categoriesOf(pinId) {
    const { rows } = await this.db.query(
      `SELECT c.id, c.name FROM categories c JOIN pin_categories pc ON pc.category_id = c.id
       WHERE pc.pin_id = $1 ORDER BY c.name`, [pinId],
    );
    return rows;
  }

  async periodsOf(pinId) {
    const { rows } = await this.db.query(
      `SELECT pe.id, pe.name, pe.year_start, pe.year_end FROM periods pe JOIN pin_periods pp ON pp.period_id = pe.id
       WHERE pp.pin_id = $1 ORDER BY pe.year_start`, [pinId],
    );
    return rows;
  }
}
