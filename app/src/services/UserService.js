import { ROLES } from '../auth/roles.js';
import { badRequest, notFound } from '../errors.js';
import { AuthService } from './AuthService.js';

export class UserService {
  /** @param {import('../db/repositories/Repositories.js').Repositories} repos */
  constructor(repos) {
    this.users = repos.users;
  }

  async list() {
    return (await this.users.findAll({}, { orderBy: ['username'] })).map(AuthService.toPublic);
  }

  async setRole(id, role) {
    if (!ROLES.includes(role)) throw badRequest('Onbekende rol');
    const user = await this.users.findById(id);
    if (!user) throw notFound('Gebruiker niet gevonden');
    if (user.role === 'admin' && role !== 'admin' && (await this.users.count({ role: 'admin' })) <= 1) {
      throw badRequest('Er moet minstens één beheerder overblijven');
    }
    return AuthService.toPublic(await this.users.updateById(id, { role }));
  }
}
