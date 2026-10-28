import { esc, mediaUrl } from '../core/dom.js';

export class RouteCard {
  static card(route) {
    return `<div class="w3-col s12 m6 l4 w3-margin-bottom">
      <div class="w3-card w3-white">
        <a href="/route.html?id=${route.id}" class="w3-block" style="text-decoration:none">
          ${route.thumbnail ? `<img src="${esc(mediaUrl(route.thumbnail))}" alt="" class="app-thumb" loading="lazy">` : ''}
          <div class="w3-container w3-padding-16">
            <h4 class="w3-margin-0">${esc(route.title)}</h4>
            <div class="w3-small w3-text-grey">${route.pin_count} ${route.pin_count === 1 ? 'stop' : 'stops'}${route.published === false ? ' · <b>concept</b>' : ''}</div>
            ${route.description ? `<p>${esc(route.description)}</p>` : ''}
          </div>
        </a>
      </div>
    </div>`;
  }
}
