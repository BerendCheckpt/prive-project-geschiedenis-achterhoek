/* global w3 */
import { api } from '../core/ApiClient.js';
import { Layout } from '../core/Layout.js';
import { $, Notifier, esc, years } from '../core/dom.js';

/** Table of the mapper's own pins or routes (admins see all) with edit/delete actions. */
const KINDS = {
  pins: {
    endpoint: '/pins', key: 'pins', editPage: 'pin-edit', viewPage: 'pin', noun: 'verhaal',
    columns: ['Titel', 'Jaar', 'Plaats', 'Status'],
    cells: (p) => [esc(p.title), esc(years(p)), esc(p.place_name || ''), p.published ? 'gepubliceerd' : 'concept'],
  },
  routes: {
    endpoint: '/routes', key: 'routes', editPage: 'route-edit', viewPage: 'route', noun: 'route',
    columns: ['Titel', 'Stops', 'Status'],
    cells: (r) => [esc(r.title), String(r.pin_count), r.published ? 'gepubliceerd' : 'concept'],
  },
};

class ManageListPage {
  constructor(kind) {
    this.kind = KINDS[kind];
  }

  async init() {
    await Layout.init({ requireRole: 'mapper' });
    $('#search').addEventListener('input', (e) => w3.filterHTML('#table', '.item', e.target.value));
    await this.load();
  }

  async load() {
    const { kind } = this;
    try {
      const items = (await api.get(kind.endpoint, new URLSearchParams({ mine: '1' })))[kind.key];
      $('#list').innerHTML = items.length
        ? `<div class="w3-responsive"><table class="w3-table w3-bordered w3-white w3-hoverable" id="table">
            <thead><tr class="w3-theme-l3">${kind.columns.map((c) => `<th>${c}</th>`).join('')}<th></th></tr></thead>
            <tbody>${items.map((item) => `<tr class="item">
              ${kind.cells(item).map((c) => `<td>${c}</td>`).join('')}
              <td class="w3-right-align" style="white-space:nowrap">
                <a class="w3-button w3-small w3-theme-l4 w3-round" href="/${kind.viewPage}.html?id=${item.id}">Bekijken</a>
                <a class="w3-button w3-small w3-theme w3-round" href="/manage/${kind.editPage}.html?id=${item.id}">Bewerken</a>
                <button class="w3-button w3-small w3-red w3-round" data-delete="${item.id}">Verwijderen</button>
              </td></tr>`).join('')}</tbody></table></div>`
        : `<p>Je hebt nog geen ${kind.noun === 'verhaal' ? 'verhalen' : 'routes'}.</p>`;
      $('#list').querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', () => this.remove(b.dataset.delete)));
    } catch (err) {
      Notifier.error(err);
    }
  }

  async remove(id) {
    if (!confirm(`Dit ${this.kind.noun === 'verhaal' ? 'verhaal' : 'route'} definitief verwijderen?`)) return;
    try {
      await api.delete(`${this.kind.endpoint}/${id}`);
      await this.load();
    } catch (err) {
      Notifier.error(err);
    }
  }
}

new ManageListPage($('script[data-kind]').dataset.kind).init();
