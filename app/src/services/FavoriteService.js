import { notFound } from '../errors.js';

export class FavoriteService {
  /** @param {import('../db/repositories/Repositories.js').Repositories} repos */
  constructor(repos) {
    this.favorites = repos.favorites;
    this.pins = repos.pins;
  }

  async pinIds(userId) {
    return (await this.favorites.findAll({ user_id: userId }, { orderBy: ['-created_at'] })).map((f) => f.pin_id);
  }

  async add(userId, pinId) {
    if (!(await this.pins.exists({ id: pinId, published: true }))) throw notFound('Verhaal niet gevonden');
    await this.favorites.insert({ user_id: userId, pin_id: pinId }, { ignoreConflicts: true });
  }

  remove(userId, pinId) {
    return this.favorites.delete({ user_id: userId, pin_id: pinId });
  }
}
