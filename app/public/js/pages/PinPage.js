import { api } from '../core/ApiClient.js';
import { Layout } from '../core/Layout.js';
import { session } from '../core/Session.js';
import { $, Notifier, esc, paragraphs, queryParam, years } from '../core/dom.js';
import { MapView } from '../components/MapView.js';
import { MediaViewer } from '../components/MediaViewer.js';

class PinPage {
  async init() {
    await Layout.init();
    try {
      this.pin = (await api.get(`/pins/${encodeURIComponent(queryParam('id'))}`)).pin;
    } catch (err) {
      return Notifier.error(err);
    }
    this.render();
  }

  render() {
    const pin = this.pin;
    document.title = `${pin.title} – Geschiedenis Achterhoek`;
    $('#title').textContent = pin.title;
    $('#meta').textContent = [years(pin), pin.place_name, pin.published ? null : 'concept'].filter(Boolean).join(' · ');
    $('#tags').innerHTML = [
      ...pin.periods.map((p) => `<span class="w3-tag w3-theme-d1 w3-round w3-margin-right">${esc(p.name)}</span>`),
      ...pin.categories.map((c) => `<span class="w3-tag w3-theme-l3 w3-round w3-margin-right">${esc(c.name)}</span>`),
    ].join('');
    $('#summary').textContent = pin.summary || '';
    $('#body').innerHTML = paragraphs(pin.body || '');
    $('#author').textContent = pin.author ? `Toegevoegd door ${pin.author}` : '';
    $('#routes').innerHTML = pin.routes.length
      ? `<h4>Onderdeel van</h4><ul class="w3-ul">${pin.routes.map((r) => `<li><a href="/route.html?id=${r.id}">${esc(r.title)}</a></li>`).join('')}</ul>`
      : '';
    new MediaViewer($('#media')).render(pin.media);
    if (pin.can_edit) {
      $('#edit').href = `/manage/pin-edit.html?id=${pin.id}`;
      $('#edit').classList.remove('w3-hide');
    }
    this.renderFavorite();
    $('#pin').classList.remove('w3-hide');

    const map = new MapView('map', { cluster: false, popups: false, zoom: 14 });
    map.setMarker(pin.lat, pin.lon, { center: true });
  }

  renderFavorite() {
    const button = $('#favorite');
    if (!session.loggedIn || !this.pin.published) return button.classList.add('w3-hide');
    button.textContent = this.pin.is_favorite ? '★ Favoriet' : '☆ Bewaar als favoriet';
    button.onclick = async () => {
      try {
        if (this.pin.is_favorite) await api.delete(`/favorites/${this.pin.id}`);
        else await api.put(`/favorites/${this.pin.id}`);
        this.pin.is_favorite = !this.pin.is_favorite;
        this.renderFavorite();
      } catch (err) {
        Notifier.error(err);
      }
    };
  }
}

new PinPage().init();
