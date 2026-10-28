import { api } from '../core/ApiClient.js';
import { Layout } from '../core/Layout.js';
import { $, Notifier } from '../core/dom.js';
import { FilterPanel } from '../components/FilterPanel.js';
import { MapView } from '../components/MapView.js';

class MapPage {
  async init() {
    await Layout.init();
    this.map = new MapView('map');
    this.filters = await new FilterPanel($('#filters'), { mode: 'pins' }).init();
    this.filters.addEventListener('change', () => this.load());
    this.filters.addEventListener('error', (e) => Notifier.error(e.detail));
    this.bindSidebar();
    this.bindLocate();
    await this.load({ fit: false });
  }

  async load({ fit = true } = {}) {
    try {
      const { pins } = await api.get('/pins', this.filters.params());
      this.map.setPins(pins, { fit: fit && pins.length > 0 });
      $('#count').textContent = `${pins.length} ${pins.length === 1 ? 'verhaal' : 'verhalen'}`;
      $('#filter-count').textContent = this.filters.activeCount ? `(${this.filters.activeCount})` : '';
    } catch (err) {
      Notifier.error(err);
    }
  }

  bindSidebar() {
    const sidebar = $('#filters');
    const overlay = $('#overlay');
    const toggle = (open) => {
      sidebar.style.display = open ? 'block' : '';
      overlay.style.display = open ? 'block' : '';
      this.map.updateSize();
    };
    $('#open-filters').addEventListener('click', () => toggle(true));
    overlay.addEventListener('click', () => toggle(false));
  }

  bindLocate() {
    const button = $('#locate');
    button.addEventListener('click', () => {
      if (this.tracking) {
        this.map.stopTracking();
        this.tracking = false;
        button.classList.remove('w3-theme');
        return;
      }
      this.tracking = true;
      button.classList.add('w3-theme');
      this.map.startTracking({
        follow: true,
        onError: () => {
          Notifier.error('Je locatie is niet beschikbaar. Sta locatietoegang toe (werkt alleen via https).');
          this.map.stopTracking();
          this.tracking = false;
          button.classList.remove('w3-theme');
        },
      });
    });
  }
}

new MapPage().init();
