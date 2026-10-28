import { notFound } from '../errors.js';
import { int, text } from '../validate.js';

/**
 * CRUD for simple maintainer-managed lists (categories, periods).
 * The list-specific part is the `parse` function that validates a request body.
 */
export class LookupService {
  /**
   * @param {import('../db/repositories/Repository.js').Repository} repo
   * @param {{ parse: (body: object) => object, orderBy: string[], label: string }} options
   */
  constructor(repo, { parse, orderBy, label }) {
    this.repo = repo;
    this.parse = parse;
    this.orderBy = orderBy;
    this.label = label;
  }

  list() {
    return this.repo.findAll({}, { orderBy: this.orderBy });
  }

  create(body) {
    return this.repo.insert(this.parse(body));
  }

  async update(id, body) {
    const row = await this.repo.updateById(id, this.parse(body));
    if (!row) throw notFound(`${this.label} niet gevonden`);
    return row;
  }

  async remove(id) {
    if (!(await this.repo.deleteById(id))) throw notFound(`${this.label} niet gevonden`);
  }
}

export const parseCategory = (body) => ({ name: text(body.name, 'Naam', { required: true, max: 100 }) });

export function parsePeriod(body) {
  const period = {
    name: text(body.name, 'Naam', { required: true, max: 100 }),
    year_start: int(body.year_start, 'Jaar vanaf', { required: true, min: -10000, max: 3000 }),
    year_end: int(body.year_end, 'Jaar tot', { required: true, min: -10000, max: 3000 }),
  };
  if (period.year_end < period.year_start) [period.year_start, period.year_end] = [period.year_end, period.year_start];
  return period;
}
