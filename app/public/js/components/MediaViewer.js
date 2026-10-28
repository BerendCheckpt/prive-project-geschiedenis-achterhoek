import { esc, mediaUrl } from '../core/dom.js';

/** Shows a pin's images (with a full-screen modal), audio and video. */
export class MediaViewer {
  constructor(container) {
    this.container = container;
  }

  render(media) {
    const images = media.filter((m) => m.kind === 'image');
    const audio = media.filter((m) => m.kind === 'audio');
    const video = media.filter((m) => m.kind === 'video');
    const caption = (m) => (m.caption ? `<div class="w3-small w3-text-grey w3-padding-small">${esc(m.caption)}</div>` : '');

    this.container.innerHTML = `
      ${images.length ? `<div class="w3-row-padding w3-stretch">${images.map((m) => `
        <div class="w3-col s12 m6 l4 w3-margin-bottom">
          <img src="${esc(mediaUrl(m.file_name))}" alt="${esc(m.caption || '')}" class="app-thumb app-clickable w3-hover-opacity" data-full="${esc(mediaUrl(m.file_name))}" loading="lazy">
          ${caption(m)}
        </div>`).join('')}</div>` : ''}
      ${audio.map((m) => `<div class="w3-margin-bottom"><audio controls preload="metadata" class="w3-block" src="${esc(mediaUrl(m.file_name))}"></audio>${caption(m)}</div>`).join('')}
      ${video.map((m) => `<div class="w3-margin-bottom"><video controls playsinline preload="metadata" class="w3-block" style="max-width:100%" src="${esc(mediaUrl(m.file_name))}"></video>${caption(m)}</div>`).join('')}
      <div class="w3-modal" data-modal>
        <span class="w3-button w3-xlarge w3-display-topright w3-black" data-close>&times;</span>
        <div class="w3-modal-content w3-animate-zoom w3-transparent"><img class="w3-image" alt="" data-modal-img></div>
      </div>`;

    const modal = this.container.querySelector('[data-modal]');
    const close = () => { modal.style.display = 'none'; };
    this.container.querySelectorAll('[data-full]').forEach((img) => img.addEventListener('click', () => {
      modal.querySelector('[data-modal-img]').src = img.dataset.full;
      modal.style.display = 'block';
    }));
    modal.addEventListener('click', close);
  }
}
