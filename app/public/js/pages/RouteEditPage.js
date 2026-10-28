/* global w3 */
import { api } from '../core/ApiClient.js';
import { Layout } from '../core/Layout.js';
import { $, $$, Notifier, esc, formValues, queryParam, years } from '../core/dom.js';
import { MapView } from '../components/MapView.js';

class RouteEditPage {
  async init() {
    await Layout.init({ requireRole: 'mapper' });
    this.id = queryParam('id');
    this.form = $('#form');
    try {
      // published pins plus the mapper's own (possibly unpublished) ones
      const [published, own, route] = await Promise.all([
        api.get('/pins'),
        api.get('/pins', new URLSearchParams({ mine: '1' })),
        this.id ? api.get(`/routes/${encodeURIComponent(this.id)}`).then((r) => r.route) : null,
      ]);
      this.pins = new Map([...published.pins, ...own.pins].map((p) => [p.id, p]));
      this.stops = route ? route.stops.map((s) => s.id).filter((id) => this.pins.has(id)) : [];
      if (route) this.fill(route);
    } catch (err) {
      return Notifier.error(err);
    }
    this.map = new MapView('map', { cluster: false, popups: false });
    $('#search').addEventListener('input', (e) => w3.filterHTML('#available', 'li', e.target.value));
    this.form.addEventListener('submit', (e) => this.save(e));
    this.render();
  }

  fill(route) {
    $('#heading').textContent = 'Route bewerken';
    this.form.elements.title.value = route.title;
    this.form.elements.description.value = route.description || '';
    this.form.elements.published.checked = route.published;
  }

  render() {
    const label = (p) => `<b>${esc(p.title)}</b><br><span class="w3-small w3-text-grey">${esc([years(p), p.place_name].filter(Boolean).join(' · '))}</span>`;
    const available = [...this.pins.values()].filter((p) => !this.stops.includes(p.id));
    $('#available').innerHTML = available.map((p) => `<li class="w3-bar">
        <button type="button" class="w3-bar-item w3-button w3-theme-l3 w3-round w3-small w3-right" data-add="${p.id}" aria-label="Toevoegen">+</button>
        <div class="w3-bar-item" style="padding-left:0">${label(p)}</div></li>`).join('') || '<li class="w3-text-grey">Geen verhalen meer</li>';
    $('#stops').innerHTML = this.stops.map((id, i) => `<li class="w3-bar">
        <span class="w3-bar-item w3-tag w3-theme w3-round" style="margin:8px 8px 0 0">${i + 1}</span>
        <div class="w3-bar-item" style="padding-left:0;max-width:60%">${label(this.pins.get(id))}</div>
        <div class="w3-right">
          <button type="button" class="w3-button w3-small" data-move="${i},-1" ${i === 0 ? 'disabled' : ''} aria-label="Omhoog">▲</button>
          <button type="button" class="w3-button w3-small" data-move="${i},1" ${i === this.stops.length - 1 ? 'disabled' : ''} aria-label="Omlaag">▼</button>
          <button type="button" class="w3-button w3-small w3-text-red" data-remove="${i}" aria-label="Verwijderen">✕</button>
        </div></li>`).join('') || '<li class="w3-text-grey">Voeg verhalen toe uit de lijst.</li>';

    $$('[data-add]').forEach((b) => b.addEventListener('click', () => { this.stops.push(Number(b.dataset.add)); this.render(); }));
    $$('[data-remove]').forEach((b) => b.addEventListener('click', () => { this.stops.splice(Number(b.dataset.remove), 1); this.render(); }));
    $$('[data-move]').forEach((b) => b.addEventListener('click', () => {
      const [i, step] = b.dataset.move.split(',').map(Number);
      [this.stops[i], this.stops[i + step]] = [this.stops[i + step], this.stops[i]];
      this.render();
    }));
    w3.filterHTML('#available', 'li', $('#search').value);
    this.map.showRoute(this.stops.map((id) => this.pins.get(id)));
  }

  async save(event) {
    event.preventDefault();
    try {
      const body = { ...formValues(this.form), pinIds: this.stops };
      const route = this.id ? (await api.put(`/routes/${this.id}`, body)).route : (await api.post('/routes', body)).route;
      if (!this.id) {
        location.href = `/manage/route-edit.html?id=${route.id}`;
        return;
      }
      Notifier.success('Route opgeslagen');
    } catch (err) {
      Notifier.error(err);
    }
  }
}

new RouteEditPage().init();
