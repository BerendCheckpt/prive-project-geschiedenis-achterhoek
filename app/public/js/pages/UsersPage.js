/* global w3 */
import { api } from '../core/ApiClient.js';
import { Layout } from '../core/Layout.js';
import { ROLES, ROLE_LABELS } from '../core/Session.js';
import { $, $$, Notifier, esc } from '../core/dom.js';

class UsersPage {
  async init() {
    await Layout.init({ requireRole: 'admin' });
    $('#search').addEventListener('input', (e) => w3.filterHTML('#table', '.item', e.target.value));
    await this.load();
  }

  async load() {
    try {
      const { users } = await api.get('/users');
      $('#users').innerHTML = `<div class="w3-responsive"><table class="w3-table w3-bordered w3-white" id="table">
        <thead><tr class="w3-theme-l3"><th>Gebruikersnaam</th><th>Naam</th><th>E-mail</th><th>Rol</th></tr></thead>
        <tbody>${users.map((u) => `<tr class="item">
          <td>${esc(u.username)}</td><td>${esc(u.displayName || '')}</td><td>${esc(u.email || '')}</td>
          <td><select class="w3-select" data-user="${u.id}" aria-label="Rol van ${esc(u.username)}">
            ${ROLES.map((r) => `<option value="${r}" ${r === u.role ? 'selected' : ''}>${ROLE_LABELS[r]}</option>`).join('')}
          </select></td></tr>`).join('')}</tbody></table></div>`;
      $$('[data-user]').forEach((s) => s.addEventListener('change', () => this.setRole(s)));
    } catch (err) {
      Notifier.error(err);
    }
  }

  async setRole(select) {
    try {
      await api.put(`/users/${select.dataset.user}/role`, { role: select.value });
      Notifier.success('Rol aangepast');
    } catch (err) {
      Notifier.error(err);
      await this.load();
    }
  }
}

new UsersPage().init();
