/* global w3 */
import { session } from './Session.js';
import { $, $$, Notifier } from './dom.js';

/** Shared page chrome: includes the navbar/footer components and adapts them to the user. */
export class Layout {
  /**
   * @param {{ requireRole?: string }} options redirect to login when the user lacks this role
   * @returns {Promise<object|null>} the current user
   */
  static async init({ requireRole } = {}) {
    await new Promise((resolve) => w3.includeHTML(resolve));
    const user = await session.load().catch(() => null);
    if (requireRole && !session.hasRole(requireRole)) {
      if (session.loggedIn) {
        document.body.querySelector('main').innerHTML = '<div class="w3-container w3-padding-32"><h2>Geen toegang</h2><p>Je hebt geen rechten voor deze pagina.</p></div>';
        Layout.renderNav();
        return new Promise(() => {}); // stop the page script
      }
      location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
      return new Promise(() => {});
    }
    Layout.renderNav();
    return user;
  }

  static renderNav() {
    for (const el of $$('[data-role]')) el.classList.toggle('w3-hide', !session.hasRole(el.dataset.role));
    for (const el of $$('[data-guest]')) el.classList.toggle('w3-hide', session.loggedIn);
    const name = $('[data-user-name]');
    if (name && session.user) name.textContent = `${session.user.displayName || session.user.username} ▾`;
    for (const el of $$('[data-nav]')) {
      if (el.dataset.nav === location.pathname && !location.search) el.classList.add('w3-theme-d4');
    }
    $('[data-menu-toggle]')?.addEventListener('click', () => $('[data-menu]').classList.toggle('w3-hide'));
    for (const el of $$('[data-logout]')) {
      el.addEventListener('click', async () => {
        try {
          await session.logout();
          location.href = '/';
        } catch (err) {
          Notifier.error(err);
        }
      });
    }
  }
}
