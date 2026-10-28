import { api } from '../core/ApiClient.js';
import { Layout } from '../core/Layout.js';
import { $, $$, Notifier, esc } from '../core/dom.js';

class ThemePage {
  async init() {
    await Layout.init({ requireRole: 'maintainer' });
    const { name, available } = await api.get('/settings/theme');
    this.saved = name;
    this.selected = name;
    $('#themes').innerHTML = available.map((theme) => `<div class="w3-col s6 m4 l3 w3-margin-bottom">
        <button class="w3-button w3-block w3-border w3-round w3-white" data-theme="${esc(theme)}">${esc(theme)}</button>
      </div>`).join('');
    $$('[data-theme]').forEach((b) => b.addEventListener('click', () => this.preview(b.dataset.theme)));
    $('#save').addEventListener('click', () => this.save());
    this.preview(name);
  }

  /** Swaps the page's theme stylesheet for the vendored file of the chosen theme. */
  preview(theme) {
    this.selected = theme;
    $('#theme-css').href = `/vendor/w3css/w3-theme-${encodeURIComponent(theme)}.css`;
    $$('[data-theme]').forEach((b) => b.classList.toggle('w3-theme', b.dataset.theme === theme));
    $('#selected').textContent = theme === this.saved ? `Huidig thema: ${theme}` : `Voorbeeld: ${theme} (nog niet opgeslagen)`;
  }

  async save() {
    try {
      this.saved = (await api.put('/settings/theme', { name: this.selected })).name;
      this.preview(this.saved);
      Notifier.success('Thema opgeslagen voor de hele website');
    } catch (err) {
      Notifier.error(err);
    }
  }
}

new ThemePage().init();
