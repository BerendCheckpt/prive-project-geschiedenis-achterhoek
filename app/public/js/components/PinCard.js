import { esc, mediaUrl, years } from '../core/dom.js';

/** HTML for a pin in lists, popups and route stop lists. */
export class PinCard {
  static meta(pin) {
    return [years(pin), pin.place_name].filter(Boolean).map(esc).join(' · ');
  }

  /** @param {Map<number,string>} categoryNames id → name */
  static card(pin, categoryNames = new Map()) {
    const tags = (pin.category_ids || [])
      .map((id) => categoryNames.get(id))
      .filter(Boolean)
      .map((name) => `<span class="w3-tag w3-small w3-theme-l3 w3-round w3-margin-right">${esc(name)}</span>`)
      .join('');
    return `<div class="w3-col s12 m6 l4 w3-margin-bottom">
      <div class="w3-card w3-white">
        <a href="/pin.html?id=${pin.id}" class="w3-block" style="text-decoration:none">
          ${pin.thumbnail ? `<img src="${esc(mediaUrl(pin.thumbnail))}" alt="" class="app-thumb" loading="lazy">` : ''}
          <div class="w3-container w3-padding-16">
            <h4 class="w3-margin-0">${pin.is_favorite ? '★ ' : ''}${esc(pin.title)}</h4>
            <div class="w3-small w3-text-grey">${PinCard.meta(pin)}${pin.published === false ? ' · <b>concept</b>' : ''}</div>
            ${pin.summary ? `<p>${esc(pin.summary)}</p>` : ''}
            <div>${tags}</div>
          </div>
        </a>
      </div>
    </div>`;
  }

  static popup(pin) {
    return `<div class="w3-container w3-padding-small">
      <span class="w3-right app-clickable w3-large" data-close aria-label="Sluiten">&times;</span>
      <h5 class="w3-margin-0">${esc(pin.title)}</h5>
      <div class="w3-small w3-text-grey">${PinCard.meta(pin)}</div>
      ${pin.summary ? `<p class="w3-small">${esc(pin.summary)}</p>` : ''}
      <p><a href="/pin.html?id=${pin.id}" class="w3-button w3-small w3-theme w3-round">Lees het verhaal</a></p>
    </div>`;
  }

  /** Numbered stop in a route. */
  static stop(pin, number, extra = '') {
    return `<li class="w3-bar">
      <span class="w3-bar-item w3-circle w3-theme w3-center" style="width:36px;height:36px;padding:6px 0">${number}</span>
      <div class="w3-bar-item">
        <a href="/pin.html?id=${pin.id}"><b>${esc(pin.title)}</b></a><br>
        <span class="w3-small w3-text-grey">${PinCard.meta(pin)}</span> ${extra}
      </div>
    </li>`;
  }
}
