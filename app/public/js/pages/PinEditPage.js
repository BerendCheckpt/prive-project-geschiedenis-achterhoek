import { api } from '../core/ApiClient.js';
import { Layout } from '../core/Layout.js';
import { $, $$, Notifier, esc, formValues, mediaUrl, queryParam } from '../core/dom.js';
import { MapView } from '../components/MapView.js';

const KIND_LABELS = { image: 'Foto', audio: 'Audio', video: 'Video' };

class PinEditPage {
  async init() {
    await Layout.init({ requireRole: 'mapper' });
    this.id = queryParam('id');
    const [categories, periods, pin] = await Promise.all([
      api.get('/categories'),
      api.get('/periods'),
      this.id ? api.get(`/pins/${encodeURIComponent(this.id)}`).then((r) => r.pin) : null,
    ]).catch((err) => { Notifier.error(err); return []; });
    if (!categories) return;

    this.form = $('#form');
    $('#categories').innerHTML = PinEditPage.checkboxes('categoryIds', categories.categories, (c) => c.name);
    $('#periods').innerHTML = PinEditPage.checkboxes('periodIds', periods.periods, (p) => `${p.name} (${p.year_start}–${p.year_end})`);

    this.map = new MapView('map', { cluster: false, popups: false });
    this.map.enablePicking(({ lat, lon }) => this.setLocation(lat, lon));
    for (const name of ['lat', 'lon']) {
      this.form.elements[name].addEventListener('change', () => this.syncMarker());
    }
    $('#here').addEventListener('click', () => this.useMyLocation());
    this.form.addEventListener('submit', (e) => this.save(e));
    $('#upload').addEventListener('submit', (e) => this.upload(e));

    if (pin) this.fill(pin);
  }

  static checkboxes(name, items, label) {
    return items.map((item) => `<label class="w3-block"><input class="w3-check" type="checkbox" data-group name="${name}" value="${item.id}"> ${esc(label(item))}</label>`).join('')
      || '<div class="w3-small w3-text-grey">Nog niets aangemaakt</div>';
  }

  fill(pin) {
    $('#heading').textContent = 'Verhaal bewerken';
    for (const key of ['title', 'summary', 'body', 'place_name', 'year_start', 'year_end', 'lat', 'lon']) {
      this.form.elements[key].value = pin[key] ?? '';
    }
    this.form.elements.published.checked = pin.published;
    const checked = new Set([...pin.categories.map((c) => `categoryIds:${c.id}`), ...pin.periods.map((p) => `periodIds:${p.id}`)]);
    $$('input[data-group]', this.form).forEach((el) => { el.checked = checked.has(`${el.name}:${el.value}`); });
    this.syncMarker(true);
    this.renderMedia(pin.media);
    $('#media-section').classList.remove('w3-hide');
  }

  setLocation(lat, lon) {
    this.form.elements.lat.value = lat.toFixed(6);
    this.form.elements.lon.value = lon.toFixed(6);
  }

  syncMarker(center = false) {
    const lat = Number(this.form.elements.lat.value);
    const lon = Number(this.form.elements.lon.value);
    if (this.form.elements.lat.value && this.form.elements.lon.value) this.map.setMarker(lat, lon, { center });
  }

  useMyLocation() {
    navigator.geolocation.getCurrentPosition(
      (p) => { this.setLocation(p.coords.latitude, p.coords.longitude); this.syncMarker(true); },
      () => Notifier.error('Je locatie kon niet worden bepaald.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async save(event) {
    event.preventDefault();
    try {
      const values = formValues(this.form);
      const pin = this.id
        ? (await api.put(`/pins/${this.id}`, values)).pin
        : (await api.post('/pins', values)).pin;
      if (!this.id) {
        location.href = `/manage/pin-edit.html?id=${pin.id}&created=1`;
        return;
      }
      Notifier.success('Verhaal opgeslagen');
    } catch (err) {
      Notifier.error(err);
    }
  }

  renderMedia(media) {
    $('#media').innerHTML = media.map((m) => `<li class="w3-bar" data-id="${m.id}">
        ${m.kind === 'image' ? `<img src="${esc(mediaUrl(m.file_name))}" alt="" class="w3-bar-item" style="width:96px;height:64px;object-fit:cover;padding:0">` : `<span class="w3-bar-item w3-tag w3-theme-l3">${KIND_LABELS[m.kind]}</span>`}
        <div class="w3-bar-item" style="width:calc(100% - 260px);min-width:160px">
          <input class="w3-input w3-border" value="${esc(m.caption || '')}" placeholder="Bijschrift" data-caption aria-label="Bijschrift">
        </div>
        <button class="w3-bar-item w3-button w3-small w3-theme w3-round" data-save-caption>Opslaan</button>
        <button class="w3-bar-item w3-button w3-small w3-red w3-round" data-delete>Verwijderen</button>
      </li>`).join('') || '<li class="w3-text-grey">Nog geen bestanden.</li>';
    $$('[data-save-caption]', $('#media')).forEach((b) => b.addEventListener('click', () => this.saveCaption(b.closest('li'))));
    $$('[data-delete]', $('#media')).forEach((b) => b.addEventListener('click', () => this.deleteMedia(b.closest('li'))));
  }

  async reloadMedia() {
    this.renderMedia((await api.get(`/pins/${this.id}`)).pin.media);
  }

  async upload(event) {
    event.preventDefault();
    const status = $('#upload-status');
    status.textContent = 'Bezig met uploaden…';
    try {
      await api.upload(`/pins/${this.id}/media`, new FormData(event.target));
      event.target.reset();
      status.textContent = '';
      await this.reloadMedia();
      Notifier.success('Bestanden toegevoegd');
    } catch (err) {
      status.textContent = '';
      Notifier.error(err);
    }
  }

  async saveCaption(li) {
    try {
      await api.put(`/media/${li.dataset.id}`, { caption: $('[data-caption]', li).value });
      Notifier.success('Bijschrift opgeslagen');
    } catch (err) {
      Notifier.error(err);
    }
  }

  async deleteMedia(li) {
    if (!confirm('Dit bestand verwijderen?')) return;
    try {
      await api.delete(`/media/${li.dataset.id}`);
      await this.reloadMedia();
    } catch (err) {
      Notifier.error(err);
    }
  }
}

new PinEditPage().init();
