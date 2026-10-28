import { api } from '../core/ApiClient.js';
import { Notifier, esc } from '../core/dom.js';

/**
 * Editable table for a simple list endpoint (GET/POST/PUT/DELETE), e.g. categories and periods.
 * fields: [{ key, label, type: 'text'|'number' }]
 */
export class CrudTable {
  /**
   * @param {HTMLElement} container
   * @param {{ endpoint: string, listKey: string, fields: {key:string,label:string,type?:string}[], noun: string }} options
   */
  constructor(container, { endpoint, listKey, fields, noun }) {
    Object.assign(this, { container, endpoint, listKey, fields, noun });
  }

  async load() {
    try {
      this.rows = (await api.get(this.endpoint))[this.listKey];
      this.render();
    } catch (err) {
      Notifier.error(err);
    }
  }

  input(field, value = '') {
    return `<input class="w3-input w3-border" name="${field.key}" type="${field.type || 'text'}" value="${esc(value)}" required aria-label="${esc(field.label)}">`;
  }

  render() {
    const head = this.fields.map((f) => `<th>${esc(f.label)}</th>`).join('');
    const rows = this.rows.map((row) => `<tr data-id="${row.id}">
        ${this.fields.map((f) => `<td>${this.input(f, row[f.key])}</td>`).join('')}
        <td class="w3-right-align" style="white-space:nowrap">
          <button class="w3-button w3-theme w3-round w3-small" data-save>Opslaan</button>
          <button class="w3-button w3-red w3-round w3-small" data-delete>Verwijderen</button>
        </td></tr>`).join('');
    const empty = `<tr data-new>${this.fields.map((f) => `<td>${this.input(f)}</td>`).join('')}
        <td class="w3-right-align"><button class="w3-button w3-theme-d1 w3-round w3-small" data-add>Toevoegen</button></td></tr>`;
    this.container.innerHTML = `<div class="w3-responsive"><table class="w3-table w3-bordered w3-white">
      <thead><tr class="w3-theme-l3">${head}<th></th></tr></thead><tbody>${rows}${empty}</tbody></table></div>`;

    this.container.querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', () => this.save(b.closest('tr'))));
    this.container.querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', () => this.remove(b.closest('tr'))));
    this.container.querySelector('[data-add]').addEventListener('click', () => this.add(this.container.querySelector('[data-new]')));
  }

  valuesOf(tr) {
    return Object.fromEntries(this.fields.map((f) => [f.key, tr.querySelector(`[name="${f.key}"]`).value]));
  }

  async add(tr) {
    try {
      await api.post(this.endpoint, this.valuesOf(tr));
      Notifier.success(`${this.noun} toegevoegd`);
      await this.load();
    } catch (err) {
      Notifier.error(err);
    }
  }

  async save(tr) {
    try {
      await api.put(`${this.endpoint}/${tr.dataset.id}`, this.valuesOf(tr));
      Notifier.success(`${this.noun} opgeslagen`);
      await this.load();
    } catch (err) {
      Notifier.error(err);
    }
  }

  async remove(tr) {
    if (!confirm(`${this.noun} verwijderen? Dit wordt ook bij alle verhalen weggehaald.`)) return;
    try {
      await api.delete(`${this.endpoint}/${tr.dataset.id}`);
      await this.load();
    } catch (err) {
      Notifier.error(err);
    }
  }
}
