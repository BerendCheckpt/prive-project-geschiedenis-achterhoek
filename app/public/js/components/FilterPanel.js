import { api } from '../core/ApiClient.js';
import { session } from '../core/Session.js';
import { $, debounce, esc } from '../core/dom.js';

/**
 * Filter form shared by the map, pin overview and route overview.
 * mode 'pins' offers a route selector; mode 'routes' offers a pin selector instead.
 * Emits a 'change' event; read the API query with params(). State is kept in the URL.
 */
export class FilterPanel extends EventTarget {
  /** @param {HTMLElement} container @param {{ mode: 'pins'|'routes' }} options */
  constructor(container, { mode = 'pins' } = {}) {
    super();
    this.container = container;
    this.mode = mode;
    this.position = null;
    this.categories = [];
  }

  async init() {
    const [categories, periods, related] = await Promise.all([
      api.get('/categories'),
      api.get('/periods'),
      this.mode === 'pins' ? api.get('/routes') : api.get('/pins'),
    ]);
    this.categories = categories.categories;
    this.render(periods.periods, this.mode === 'pins' ? related.routes : related.pins);
    this.restore(new URLSearchParams(location.search));
    const emit = debounce(() => this.changed(), 300);
    this.form.addEventListener('input', emit);
    this.form.addEventListener('change', emit);
    this.form.addEventListener('submit', (e) => { e.preventDefault(); this.changed(); });
    $('[data-reset]', this.form).addEventListener('click', () => { this.form.reset(); this.position = null; this.changed(); });
    $('[name="nearMe"]', this.form).addEventListener('change', (e) => this.toggleNearMe(e.target));
    if ($('[name="nearMe"]', this.form).checked) await this.toggleNearMe($('[name="nearMe"]', this.form));
    return this;
  }

  get categoryNames() {
    return new Map(this.categories.map((c) => [c.id, c.name]));
  }

  render(periods, related) {
    const checkboxes = (name, items, label) => items.map((item) => `
      <label class="w3-block"><input class="w3-check" type="checkbox" data-group name="${name}" value="${item.id}"> ${esc(label(item))}</label>`).join('');
    const relatedSelect = this.mode === 'pins'
      ? `<label>Route</label><select class="w3-select" name="route"><option value="">Alle routes</option>
          ${related.map((r) => `<option value="${r.id}">${esc(r.title)}</option>`).join('')}</select>`
      : `<label>Bevat verhaal</label><select class="w3-select" name="pin"><option value="">Alle verhalen</option>
          ${related.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select>`;

    this.container.innerHTML = `<form class="w3-container w3-padding-16" autocomplete="off">
      <h4>Filters</h4>
      <p><label>Zoeken</label><input class="w3-input w3-border" name="q" type="search" placeholder="Titel of tekst"></p>
      <p><label>Plaats</label><input class="w3-input w3-border" name="place" placeholder="bijv. Groenlo"></p>
      <p>
        <label><input class="w3-check" type="checkbox" name="nearMe"> Bij mij in de buurt</label>
        <select class="w3-select" name="radius">
          ${[1, 5, 10, 25].map((km) => `<option value="${km}" ${km === 5 ? 'selected' : ''}>binnen ${km} km</option>`).join('')}
        </select>
      </p>
      <div class="w3-section"><b>Periode</b>${checkboxes('period', periods, (p) => `${p.name} (${p.year_start}–${p.year_end})`) || '<div class="w3-small w3-text-grey">Nog geen periodes</div>'}</div>
      <div class="w3-row w3-section">
        <div class="w3-half" style="padding-right:4px"><label>Jaar vanaf</label><input class="w3-input w3-border" name="yearFrom" type="number"></div>
        <div class="w3-half" style="padding-left:4px"><label>Jaar tot</label><input class="w3-input w3-border" name="yearTo" type="number"></div>
      </div>
      <div class="w3-section"><b>Categorie</b>${checkboxes('category', this.categories, (c) => c.name) || '<div class="w3-small w3-text-grey">Nog geen categorieën</div>'}</div>
      <p class="${session.loggedIn ? '' : 'w3-hide'}"><label><input class="w3-check" type="checkbox" name="favorites"> Alleen favorieten</label></p>
      <p>${relatedSelect}</p>
      <p><button type="button" class="w3-button w3-theme-l3 w3-round" data-reset>Wissen</button></p>
    </form>`;
    this.form = $('form', this.container);
  }

  restore(params) {
    for (const el of this.form.elements) {
      if (!el.name) continue;
      if (el.type === 'checkbox' && el.dataset.group !== undefined) {
        el.checked = (params.get(el.name) || '').split(',').includes(el.value);
      } else if (el.type === 'checkbox') {
        el.checked = params.get(el.name) === '1';
      } else if (params.has(el.name)) {
        el.value = params.get(el.name);
      }
    }
  }

  async toggleNearMe(checkbox) {
    if (!checkbox.checked) { this.position = null; return; }
    try {
      this.position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }), reject, { enableHighAccuracy: true, timeout: 10000 },
      ));
      this.changed();
    } catch {
      checkbox.checked = false;
      this.dispatchEvent(new CustomEvent('error', { detail: 'Je locatie kon niet worden bepaald.' }));
    }
  }

  /** Values as they appear in the page URL. */
  urlParams() {
    const params = new URLSearchParams();
    for (const el of this.form.elements) {
      if (!el.name) continue;
      if (el.type === 'checkbox' && el.dataset.group !== undefined) {
        if (el.checked) params.set(el.name, [params.get(el.name), el.value].filter(Boolean).join(','));
      } else if (el.type === 'checkbox') {
        if (el.checked) params.set(el.name, '1');
      } else if (el.value && !(el.name === 'radius' && !this.position)) {
        params.set(el.name, el.value);
      }
    }
    return params;
  }

  /** Query for the API: like urlParams, with nearMe replaced by near=lat,lon. */
  params() {
    const params = this.urlParams();
    params.delete('nearMe');
    if (this.position) params.set('near', `${this.position.lat},${this.position.lon}`);
    else params.delete('radius');
    return params;
  }

  get activeCount() {
    return [...this.params().keys()].filter((k) => k !== 'radius').length;
  }

  changed() {
    const query = String(this.urlParams());
    history.replaceState(null, '', query ? `?${query}` : location.pathname);
    this.dispatchEvent(new Event('change'));
  }
}
