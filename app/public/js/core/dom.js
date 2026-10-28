const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes text for safe use in HTML (content and attribute values). */
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export const mediaUrl = (fileName) => `/media/${fileName.split('/').map(encodeURIComponent).join('/')}`;

/** "1627", "1942–1945" or "" */
export function years(item) {
  const { year_start: from, year_end: to } = item;
  if (from === null || from === undefined) return '';
  return to !== null && to !== undefined && to !== from ? `${from}–${to}` : String(from);
}

/** Plain text with blank lines → escaped paragraphs. */
export const paragraphs = (text) => esc(text)
  .split(/\n{2,}/)
  .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
  .join('');

export const queryParam = (name) => new URLSearchParams(location.search).get(name);

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Collects named form controls into an object; checkbox groups become arrays. */
export function formValues(form) {
  const values = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    if (el.type === 'checkbox') {
      if (el.dataset.group !== undefined) {
        values[el.name] ??= [];
        if (el.checked) values[el.name].push(el.value);
      } else values[el.name] = el.checked;
    } else if (el.type !== 'file' && el.type !== 'submit' && el.type !== 'button') {
      values[el.name] = el.value;
    }
  }
  return values;
}

/** Shows feedback in the page's [data-messages] element (or at the top of <main>). */
export class Notifier {
  static container() {
    let box = $('[data-messages]');
    if (!box) {
      box = document.createElement('div');
      box.dataset.messages = '';
      ($('main') || document.body).prepend(box);
    }
    return box;
  }

  static show(message, type = 'error') {
    const colours = { error: 'w3-pale-red w3-border-red', success: 'w3-pale-green w3-border-green', info: 'w3-theme-l4' };
    const panel = document.createElement('div');
    panel.className = `w3-panel w3-leftbar w3-padding ${colours[type] || colours.info}`;
    panel.innerHTML = `<span class="w3-right app-clickable" aria-label="Sluiten">&times;</span>${esc(message)}`;
    panel.firstChild.addEventListener('click', () => panel.remove());
    const box = Notifier.container();
    box.replaceChildren(panel);
    if (type === 'success') setTimeout(() => panel.remove(), 4000);
  }

  static error(err) {
    Notifier.show(err?.message || String(err), 'error');
  }

  static success(message) {
    Notifier.show(message, 'success');
  }
}
