import { Repository } from './Repository.js';
import { ROUTES } from './schemas.js';
import { SqlParams } from '../SqlParams.js';
import { THUMBNAIL_SQL } from './PinRepository.js';

export class RouteRepository extends Repository {
  constructor(db) {
    super(db, ROUTES);
  }

  /**
   * Routes matching: visibility, containing any of `pinIds`, and — when `pinCriteria` has
   * filters — containing at least one published pin that matches them.
   */
  async search({ publishedOnly = true, ownerId = null, pinIds = [], pinCriteria = null } = {}) {
    const params = new SqlParams();
    const where = [];
    if (publishedOnly) where.push('r.published');
    if (ownerId) where.push(`r.owner_id = ${params.add(ownerId)}`);
    if (pinIds.length) {
      where.push(`EXISTS (SELECT 1 FROM route_pins x WHERE x.route_id = r.id AND x.pin_id = ANY(${params.add(pinIds)}))`);
    }
    const pinWhere = pinCriteria ? pinCriteria.conditions(params, 'p') : [];
    if (pinWhere.length) {
      where.push(`EXISTS (SELECT 1 FROM route_pins rp JOIN pins p ON p.id = rp.pin_id
        WHERE rp.route_id = r.id AND ${pinWhere.join(' AND ')})`);
    }
    const { rows } = await this.db.query(
      `SELECT r.*,
              (SELECT count(*)::int FROM route_pins rp JOIN pins p ON p.id = rp.pin_id
                 WHERE rp.route_id = r.id AND p.published) AS pin_count,
              (SELECT ${THUMBNAIL_SQL('p')} FROM route_pins rp JOIN pins p ON p.id = rp.pin_id
                 WHERE rp.route_id = r.id ORDER BY rp.position LIMIT 1) AS thumbnail
       FROM routes r
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY r.title`,
      params.values,
    );
    return rows;
  }

  /** Stops of a route in order. */
  async stops(routeId, { publishedOnly = true } = {}) {
    const { rows } = await this.db.query(
      `SELECT p.id, p.owner_id, p.title, p.summary, p.lat, p.lon, p.place_name, p.year_start, p.year_end, p.published,
              rp.position, ${THUMBNAIL_SQL('p')} AS thumbnail
       FROM route_pins rp JOIN pins p ON p.id = rp.pin_id
       WHERE rp.route_id = $1 ${publishedOnly ? 'AND p.published' : ''}
       ORDER BY rp.position`,
      [routeId],
    );
    return rows;
  }

  async publishedContaining(pinId) {
    const { rows } = await this.db.query(
      `SELECT r.id, r.title FROM routes r JOIN route_pins rp ON rp.route_id = r.id
       WHERE rp.pin_id = $1 AND r.published ORDER BY r.title`, [pinId],
    );
    return rows;
  }
}
