import { HttpError, badRequest } from '../errors.js';
import { text } from '../validate.js';
import { PasswordHasher } from './PasswordHasher.js';

const USERNAME = /^[a-zA-Z0-9_.-]{3,32}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export class AuthService {
  /** @param {import('../db/repositories/Repositories.js').Repositories} repos */
  constructor(repos, hasher = new PasswordHasher()) {
    this.users = repos.users;
    this.hasher = hasher;
  }

  /** Shape sent to the browser (never the password hash). */
  static toPublic(user) {
    return user && {
      id: user.id, username: user.username, email: user.email, displayName: user.display_name, role: user.role,
    };
  }

  static password(value, label = 'Wachtwoord') {
    const s = text(value, label, { required: true, max: 200 });
    if (s.length < 8) throw badRequest(`${label} moet minimaal 8 tekens hebben`);
    return s;
  }

  findUser(id) {
    return this.users.findById(id);
  }

  async register(input) {
    const username = text(input.username, 'Gebruikersnaam', { required: true, max: 32 });
    if (!USERNAME.test(username)) {
      throw badRequest('Gebruikersnaam: 3–32 tekens, alleen letters, cijfers, punt, streepje of underscore');
    }
    const email = text(input.email, 'E-mail', { max: 200 });
    if (email && !EMAIL.test(email)) throw badRequest('Ongeldig e-mailadres');
    const passwordHash = await this.hasher.hash(AuthService.password(input.password));
    try {
      return await this.users.insert({
        username, email, display_name: text(input.displayName, 'Naam', { max: 100 }), password_hash: passwordHash,
      });
    } catch (err) {
      if (err.code === '23505') throw new HttpError(409, 'Gebruikersnaam of e-mail is al in gebruik');
      throw err;
    }
  }

  async authenticate(input) {
    const name = text(input.username, 'Gebruikersnaam', { required: true, max: 200 });
    const password = text(input.password, 'Wachtwoord', { required: true, max: 200 });
    const user = await this.users.findByLogin(name);
    if (!user || !(await this.hasher.verify(password, user.password_hash))) {
      throw new HttpError(401, 'Onjuiste gebruikersnaam of wachtwoord');
    }
    return user;
  }

  async changePassword(userId, input) {
    const current = text(input.currentPassword, 'Huidig wachtwoord', { required: true, max: 200 });
    const next = AuthService.password(input.newPassword, 'Nieuw wachtwoord');
    const user = await this.users.findById(userId);
    if (!(await this.hasher.verify(current, user.password_hash))) throw badRequest('Huidig wachtwoord klopt niet');
    await this.users.updateById(userId, { password_hash: await this.hasher.hash(next) });
  }
}
