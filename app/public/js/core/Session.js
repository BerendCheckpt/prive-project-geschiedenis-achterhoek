import { api } from './ApiClient.js';

export const ROLES = ['user', 'mapper', 'maintainer', 'admin'];

export const ROLE_LABELS = { user: 'Gebruiker', mapper: 'Mapper', maintainer: 'Onderhouder', admin: 'Beheerder' };

/** The logged-in user as known to the browser. */
class Session {
  constructor() {
    this.user = null;
  }

  async load() {
    this.user = (await api.get('/auth/me')).user;
    return this.user;
  }

  get loggedIn() {
    return !!this.user;
  }

  hasRole(minRole) {
    return !!this.user && ROLES.indexOf(this.user.role) >= ROLES.indexOf(minRole);
  }

  canEdit(row) {
    return !!this.user && (this.user.role === 'admin' || row.owner_id === this.user.id);
  }

  async login(username, password) {
    this.user = (await api.post('/auth/login', { username, password })).user;
    return this.user;
  }

  async register(data) {
    this.user = (await api.post('/auth/register', data)).user;
    return this.user;
  }

  async logout() {
    await api.post('/auth/logout');
    this.user = null;
  }
}

export const session = new Session();
