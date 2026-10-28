import { Layout } from '../core/Layout.js';
import { session } from '../core/Session.js';
import { $, $$, Notifier, formValues, queryParam } from '../core/dom.js';

class LoginPage {
  async init() {
    await Layout.init();
    $$('[data-tab]').forEach((tab) => tab.addEventListener('click', () => this.showTab(tab.dataset.tab)));
    $('#login').addEventListener('submit', (e) => this.submit(e, (v) => session.login(v.username, v.password)));
    $('#register').addEventListener('submit', (e) => this.submit(e, (v) => session.register(v)));
  }

  showTab(name) {
    for (const tab of $$('[data-tab]')) tab.classList.toggle('w3-theme', tab.dataset.tab === name);
    $('#login').classList.toggle('w3-hide', name !== 'login');
    $('#register').classList.toggle('w3-hide', name !== 'register');
  }

  async submit(event, action) {
    event.preventDefault();
    try {
      await action(formValues(event.target));
      const next = queryParam('next');
      location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
    } catch (err) {
      Notifier.error(err);
    }
  }
}

new LoginPage().init();
