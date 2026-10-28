const EARTH_RADIUS_KM = 6371;

/**
 * Translates a PinFilter (see services/PinFilter.js) plus a visibility scope into SQL
 * conditions on a pins alias. Shared by the pin and route searches.
 */
export class PinCriteria {
  /**
   * @param {import('../../services/PinFilter.js').PinFilter} filter
   * @param {{ publishedOnly?: boolean, ownerId?: number|null, userId?: number|null }} scope
   *   userId is needed for the favorites filter.
   */
  constructor(filter, { publishedOnly = true, ownerId = null, userId = null } = {}) {
    this.filter = filter;
    this.publishedOnly = publishedOnly;
    this.ownerId = ownerId;
    this.userId = userId;
  }

  static distanceSql(p, lat, lon) {
    return `(${EARTH_RADIUS_KM} * 2 * asin(sqrt(power(sin(radians(${lat} - ${p}.lat) / 2), 2)
      + cos(radians(${p}.lat)) * cos(radians(${lat})) * power(sin(radians(${lon} - ${p}.lon) / 2), 2))))`;
  }

  /** @returns {string[]} conditions to AND together */
  conditions(params, p = 'p') {
    const f = this.filter;
    const where = [];
    if (this.publishedOnly) where.push(`${p}.published`);
    if (this.ownerId) where.push(`${p}.owner_id = ${params.add(this.ownerId)}`);
    if (f.q) {
      const like = params.add(`%${f.q}%`);
      where.push(`(${p}.title ILIKE ${like} OR ${p}.summary ILIKE ${like} OR ${p}.body ILIKE ${like} OR ${p}.place_name ILIKE ${like})`);
    }
    if (f.place) where.push(`${p}.place_name ILIKE ${params.add(`%${f.place}%`)}`);
    if (f.near) {
      const dist = PinCriteria.distanceSql(p, params.add(f.near.lat), params.add(f.near.lon));
      where.push(`${dist} <= ${params.add(f.near.radius)}`);
    }
    if (f.bbox) {
      const [minLon, minLat, maxLon, maxLat] = f.bbox.map((v) => params.add(v));
      where.push(`${p}.lon BETWEEN ${minLon} AND ${maxLon} AND ${p}.lat BETWEEN ${minLat} AND ${maxLat}`);
    }
    if (f.periods.length) {
      // explicitly linked to a period, or the pin's years overlap it
      const list = params.add(f.periods);
      where.push(`(EXISTS (SELECT 1 FROM pin_periods pp WHERE pp.pin_id = ${p}.id AND pp.period_id = ANY(${list}))
        OR EXISTS (SELECT 1 FROM periods pe WHERE pe.id = ANY(${list})
          AND ${p}.year_start <= pe.year_end AND coalesce(${p}.year_end, ${p}.year_start) >= pe.year_start))`);
    }
    if (f.yearFrom !== null) where.push(`coalesce(${p}.year_end, ${p}.year_start) >= ${params.add(f.yearFrom)}`);
    if (f.yearTo !== null) where.push(`${p}.year_start <= ${params.add(f.yearTo)}`);
    if (f.categories.length) {
      where.push(`EXISTS (SELECT 1 FROM pin_categories pc WHERE pc.pin_id = ${p}.id AND pc.category_id = ANY(${params.add(f.categories)}))`);
    }
    if (f.routes.length) {
      where.push(`EXISTS (SELECT 1 FROM route_pins rp WHERE rp.pin_id = ${p}.id AND rp.route_id = ANY(${params.add(f.routes)}))`);
    }
    if (f.favorites) {
      where.push(this.userId
        ? `EXISTS (SELECT 1 FROM favorites fv WHERE fv.pin_id = ${p}.id AND fv.user_id = ${params.add(this.userId)})`
        : 'false');
    }
    return where;
  }
}
