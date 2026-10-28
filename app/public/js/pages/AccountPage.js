import { api } from '../core/ApiClient.js';
import { Layout } from '../core/Layout.js';
import { ROLE_LABELS } from '../core/Session.js';
import { $, Notifier, formValues } from '../core/dom.js';

class AccountPage {
  async init() {
    const user = await Layout.init({ requireRole: 'user' });
    $('#username').textContent = user.username;
    $('#role').textContent = ROLE_LABELS[user.role];
    $('#password').addEventListener('submit', (e) => this.changePassword(e));
  }

  async changePassword(event) {
    event.preventDefault();
    try {
      await api.put('/auth/password', formValues(event.target));
      event.target.reset();
      Notifier.success('Wachtwoord gewijzigd');
    } catch (err) {
      Notifier.error(err);
    }
  }
}

new AccountPage().init();
