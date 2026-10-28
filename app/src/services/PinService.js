import { canEdit, hasRole } from '../auth/roles.js';
import { forbidden, notFound } from '../errors.js';
import { PinCriteria } from '../db/repositories/PinCriteria.js';
import { bool, ids, int, num, text } from '../validate.js';
import { PinFilter } from './PinFilter.js';

const NOT_FOUND = 'Verhaal niet gevonden';

export class PinService {
  /**
   * @param {import('../db/repositories/Repositories.js').Repositories} repos
   * @param {import('./MediaStorage.js').MediaStorage} storage
   */
  constructor(repos, storage) {
    this.repos = repos;
    this.storage = storage;
  }

  /** Validates and normalises a create/update request body. */
  static parseInput(body) {
    const pin = {
      title: text(body.title, 'Titel', { required: true, max: 200 }),
      summary: text(body.summary, 'Samenvatting', { max: 500 }),
      body: text(body.body, 'Verhaal', { max: 100000 }),
      lat: num(body.lat, 'Breedtegraad', { required: true, min: -90, max: 90 }),
      lon: num(body.lon, 'Lengtegraad', { required: true, min: -180, max: 180 }),
      place_name: text(body.place_name, 'Plaats', { max: 200 }),
      year_start: int(body.year_start, 'Jaar vanaf', { min: -10000, max: 3000 }),
      year_end: int(body.year_end, 'Jaar tot', { min: -10000, max: 3000 }),
      published: bool(body.published, true),
    };
    if (pin.year_start === null) pin.year_start = pin.year_end;
    if (pin.year_end !== null && pin.year_end < pin.year_start) [pin.year_start, pin.year_end] = [pin.year_end, pin.year_start];
    return { pin, categoryIds: ids(body.categoryIds), periodIds: ids(body.periodIds) };
  }

  /** ?mine=1 lists the mapper's own pins (admin: all), including unpublished ones. */
  static scopeFor(query, user) {
    if (query.mine !== '1') return { publishedOnly: true };
    if (!hasRole(user, 'mapper')) throw forbidden();
    return { publishedOnly: false, ownerId: user.role === 'admin' ? null : user.id };
  }

  list(query, user) {
    const criteria = new PinCriteria(PinFilter.fromQuery(query), { ...PinService.scopeFor(query, user), userId: user?.id });
    return this.repos.pins.search(criteria, { favoritesOf: user?.id });
  }

  async get(id, user) {
    const pin = await this.repos.pins.findById(id);
    if (!pin || (!pin.published && !canEdit(user, pin))) throw notFound(NOT_FOUND);
    const [media, categories, periods, routes, owner, favorite] = await Promise.all([
      this.repos.media.findAll({ pin_id: id }, { orderBy: ['sort_order', 'id'] }),
      this.repos.pins.categoriesOf(id),
      this.repos.pins.periodsOf(id),
      this.repos.routes.publishedContaining(id),
      this.repos.users.findById(pin.owner_id),
      user ? this.repos.favorites.exists({ user_id: user.id, pin_id: id }) : false,
    ]);
    return {
      ...pin,
      author: owner?.display_name || owner?.username,
      media,
      categories,
      periods,
      routes,
      is_favorite: favorite,
      can_edit: canEdit(user, pin),
    };
  }

  /** Loads a pin the user may change, or throws 404/403. */
  async findEditable(id, user) {
    const pin = await this.repos.pins.findById(id);
    if (!pin) throw notFound(NOT_FOUND);
    if (!canEdit(user, pin)) throw forbidden();
    return pin;
  }

  create(body, user) {
    const { pin, categoryIds, periodIds } = PinService.parseInput(body);
    return this.repos.transaction(async (r) => {
      const created = await r.pins.insert({ ...pin, owner_id: user.id });
      await PinService.saveLinks(r, created.id, categoryIds, periodIds);
      return created;
    });
  }

  async update(id, body, user) {
    await this.findEditable(id, user);
    const { pin, categoryIds, periodIds } = PinService.parseInput(body);
    return this.repos.transaction(async (r) => {
      const updated = await r.pins.updateById(id, { ...pin, updated_at: new Date() });
      await PinService.saveLinks(r, id, categoryIds, periodIds);
      return updated;
    });
  }

  async remove(id, user) {
    await this.findEditable(id, user);
    await this.repos.pins.deleteById(id);
    await this.storage.removePin(id);
  }

  static async saveLinks(r, pinId, categoryIds, periodIds) {
    await r.pinCategories.delete({ pin_id: pinId });
    await r.pinPeriods.delete({ pin_id: pinId });
    await r.pinCategories.insertMany(categoryIds.map((category_id) => ({ pin_id: pinId, category_id })));
    await r.pinPeriods.insertMany(periodIds.map((period_id) => ({ pin_id: pinId, period_id })));
  }
}
