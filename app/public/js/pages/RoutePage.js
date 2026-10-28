import { api } from '../core/ApiClient.js';
import { Layout } from '../core/Layout.js';
import { $, $$, Notifier, esc, queryParam } from '../core/dom.js';
import { MapView } from '../components/MapView.js';
import { PinCard } from '../components/PinCard.js';

const ARRIVED_METRES = 40;

const formatDistance = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

class RoutePage {
  async init() {
    await Layout.init();
    try {
      this.route = (await api.get(`/routes/${encodeURIComponent(queryParam('id'))}`)).route;
    } catch (err) {
      return Notifier.error(err);
    }
    this.nextIndex = 0;
    this.render();
  }

  render() {
    const { route } = this;
    document.title = `${route.title} – Geschiedenis Achterhoek`;
    $('#title').textContent = route.title;
    $('#description').textContent = route.description || '';
    $('#summary').textContent = `${route.stops.length} stops · ${formatDistance(this.length())} hemelsbreed`;
    $('#gpx').href = `/api/routes/${route.id}/export.gpx`;
    if (route.can_edit) {
      $('#edit').href = `/manage/route-edit.html?id=${route.id}`;
      $('#edit').classList.remove('w3-hide');
    }
    $('#route').classList.remove('w3-hide');
    this.map = new MapView('map', { cluster: false });
    this.map.showRoute(route.stops);
    this.renderStops();
    $('#follow').addEventListener('click', () => this.toggleFollow());
    $$('[data-app]').forEach((b) => b.addEventListener('click', () => this.openInApp(b.dataset.app)));
  }

  length() {
    return this.route.stops.slice(1).reduce((sum, stop, i) => sum + MapView.distance(this.route.stops[i], stop), 0);
  }

  renderStops(position) {
    $('#stops').innerHTML = this.route.stops.map((stop, i) => {
      const extra = position ? `<span class="w3-tag w3-small w3-round ${i === this.nextIndex ? 'w3-theme' : 'w3-light-grey'}">${formatDistance(MapView.distance(position, stop))}</span>` : '';
      return PinCard.stop(stop, i + 1, extra);
    }).join('');
  }

  toggleFollow() {
    const button = $('#follow');
    if (this.following) {
      this.following = false;
      this.map.stopTracking();
      button.textContent = '▶ Route volgen';
      $('#next-stop').classList.add('w3-hide');
      this.renderStops();
      return;
    }
    this.following = true;
    button.textContent = '■ Stoppen met volgen';
    this.map.startTracking({
      follow: true,
      onPosition: (position) => this.updatePosition(position),
      onError: () => {
        Notifier.error('Je locatie is niet beschikbaar. Sta locatietoegang toe (werkt alleen via https).');
        if (this.following) this.toggleFollow();
      },
    });
  }

  /** Advances to the next stop once the user is within ARRIVED_METRES of the current one. */
  updatePosition(position) {
    const stops = this.route.stops;
    while (this.nextIndex < stops.length - 1 && MapView.distance(position, stops[this.nextIndex]) < ARRIVED_METRES) {
      this.nextIndex += 1;
    }
    const next = stops[this.nextIndex];
    const distance = MapView.distance(position, next);
    const panel = $('#next-stop');
    panel.innerHTML = distance < ARRIVED_METRES
      ? `<b>Je bent bij stop ${this.nextIndex + 1}:</b> <a href="/pin.html?id=${next.id}">${esc(next.title)}</a>`
      : `<b>Volgende stop ${this.nextIndex + 1}:</b> ${esc(next.title)} – nog ${formatDistance(distance)}`;
    panel.classList.remove('w3-hide');
    this.renderStops(position);
  }

  async openInApp(app) {
    try {
      const links = await api.get(`/routes/${this.route.id}/links`, new URLSearchParams({ mode: $('#mode').value }));
      const urls = links[app];
      if (urls.length === 1) {
        window.open(urls[0], '_blank', 'noopener');
        $('#legs').innerHTML = '';
        return;
      }
      $('#legs').innerHTML = `<p>Deze route is te lang voor één link en is opgedeeld in delen:</p>
        ${urls.map((u, i) => `<a class="w3-button w3-border w3-round w3-small w3-margin-right w3-margin-bottom" target="_blank" rel="noopener" href="${esc(u)}">Deel ${i + 1}</a>`).join('')}`;
    } catch (err) {
      Notifier.error(err);
    }
  }
}

new RoutePage().init();
