import path from 'node:path';
import defaultConfig from './config.js';
import { Database } from './db/Database.js';
import { Repositories } from './db/repositories/Repositories.js';
import { AuthService } from './services/AuthService.js';
import { FavoriteService } from './services/FavoriteService.js';
import { LookupService, parseCategory, parsePeriod } from './services/LookupService.js';
import { MediaService } from './services/MediaService.js';
import { MediaStorage } from './services/MediaStorage.js';
import { PinService } from './services/PinService.js';
import { RouteService } from './services/RouteService.js';
import { ThemeService } from './services/ThemeService.js';
import { UserService } from './services/UserService.js';

/** Composition root: builds the object graph once. Tests can pass their own config. */
export function createContainer(config = defaultConfig) {
  const db = Database.connect(config.databaseUrl);
  const repos = new Repositories(db);
  const storage = new MediaStorage(config.mediaDir, { maxBytes: config.maxUploadMb * 1024 * 1024 });
  const pins = new PinService(repos, storage);

  const services = {
    auth: new AuthService(repos),
    pins,
    routes: new RouteService(repos),
    media: new MediaService(repos, storage, pins),
    favorites: new FavoriteService(repos),
    categories: new LookupService(repos.categories, { parse: parseCategory, orderBy: ['name'], label: 'Categorie' }),
    periods: new LookupService(repos.periods, { parse: parsePeriod, orderBy: ['year_start', 'name'], label: 'Periode' }),
    theme: new ThemeService(repos.settings, path.join(config.publicDir, 'vendor', 'w3css')),
    users: new UserService(repos),
  };

  return { config, db, repos, storage, services };
}
