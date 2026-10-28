import { api } from '../core/ApiClient.js';
import { Layout } from '../core/Layout.js';
import { $, Notifier } from '../core/dom.js';
import { FilterPanel } from '../components/FilterPanel.js';
import { PinCard } from '../components/PinCard.js';
import { RouteCard } from '../components/RouteCard.js';

/** Overview of pins or routes with the shared filter panel; kind comes from the script tag. */
const KINDS = {
  pins: {
    endpoint: '/pins',
    key: 'pins',
    render: (item, page) => PinCard.card(item, page.filters.categoryNames),
    count: (n) => `${n} ${n === 1 ? 'verhaal' : 'verhalen'}`,
    empty: 'Geen verhalen gevonden met deze filters.',
  },
  routes: {
    endpoint: '/routes',
    key: 'routes',
    render: (item) => RouteCard.card(item),
    count: (n) => `${n} ${n === 1 ? 'route' : 'routes'}`,
    empty: 'Geen routes gevonden met deze filters.',
  },
};

class ListPage {
  constructor(kind) {
    this.kind = KINDS[kind];
    this.mode = kind;
  }

  async init() {
    await Layout.init();
    this.filters = await new FilterPanel($('#filters'), { mode: this.mode }).init();
    this.filters.addEventListener('change', () => this.load());
    this.filters.addEventListener('error', (e) => Notifier.error(e.detail));
    const sidebar = $('#filters');
    const overlay = $('#overlay');
    const toggle = (open) => { sidebar.style.display = open ? 'block' : ''; overlay.style.display = open ? 'block' : ''; };
    $('#open-filters').addEventListener('click', () => toggle(true));
    overlay.addEventListener('click', () => toggle(false));
    await this.load();
  }

  async load() {
    try {
      const params = this.filters.params();
      if (this.mode === 'pins') $('#title').textContent = params.get('favorites') === '1' ? 'Mijn favorieten' : 'Verhalen';
      const items = (await api.get(this.kind.endpoint, params))[this.kind.key];
      $('#count').textContent = this.kind.count(items.length);
      $('#filter-count').textContent = this.filters.activeCount ? `(${this.filters.activeCount})` : '';
      $('#list').innerHTML = items.length
        ? items.map((item) => this.kind.render(item, this)).join('')
        : `<div class="w3-container"><p>${this.kind.empty}</p></div>`;
    } catch (err) {
      Notifier.error(err);
    }
  }
}

new ListPage($('script[data-kind]').dataset.kind).init();
