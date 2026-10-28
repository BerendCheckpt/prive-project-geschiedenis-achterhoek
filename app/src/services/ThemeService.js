import { readdirSync } from 'node:fs';
import { badRequest } from '../errors.js';

/** The site-wide W3.CSS colour theme, stored in settings['theme'] and chosen by a maintainer. */
export class ThemeService {
  static DEFAULT = 'green';
  static KEY = 'theme';

  /**
   * @param {import('../db/repositories/Repository.js').Repository} settings
   * @param {string} themeDir directory with w3-theme-<name>.css files
   */
  constructor(settings, themeDir, { cacheMs = 10_000 } = {}) {
    this.settings = settings;
    this.themeDir = themeDir;
    this.cacheMs = cacheMs;
    this.cache = { name: null, at: 0 };
  }

  available() {
    return readdirSync(this.themeDir)
      .map((f) => /^w3-theme-(.+)\.css$/.exec(f)?.[1])
      .filter(Boolean)
      .sort();
  }

  fileName(name) {
    return `w3-theme-${name}.css`;
  }

  async current() {
    if (this.cache.name && Date.now() - this.cache.at < this.cacheMs) return this.cache.name;
    const name = (await this.settings.findById(ThemeService.KEY))?.value?.name;
    this.cache = { name: this.available().includes(name) ? name : ThemeService.DEFAULT, at: Date.now() };
    return this.cache.name;
  }

  async set(name) {
    if (!this.available().includes(name)) throw badRequest('Onbekend thema');
    await this.settings.upsert({ key: ThemeService.KEY, value: { name } });
    this.cache = { name, at: Date.now() };
    return name;
  }
}
