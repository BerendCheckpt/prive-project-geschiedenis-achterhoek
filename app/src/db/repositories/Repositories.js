import { Repository } from './Repository.js';
import { UserRepository } from './UserRepository.js';
import { PinRepository } from './PinRepository.js';
import { RouteRepository } from './RouteRepository.js';
import * as schema from './schemas.js';

/**
 * All repositories bound to one Database. `transaction(fn)` gives fn a set bound to a
 * single transaction (unit of work).
 */
export class Repositories {
  /** @param {import('../Database.js').Database} db */
  constructor(db) {
    this.db = db;
    this.users = new UserRepository(db);
    this.pins = new PinRepository(db);
    this.routes = new RouteRepository(db);
    this.media = new Repository(db, schema.MEDIA);
    this.categories = new Repository(db, schema.CATEGORIES);
    this.periods = new Repository(db, schema.PERIODS);
    this.pinCategories = new Repository(db, schema.PIN_CATEGORIES);
    this.pinPeriods = new Repository(db, schema.PIN_PERIODS);
    this.routePins = new Repository(db, schema.ROUTE_PINS);
    this.favorites = new Repository(db, schema.FAVORITES);
    this.settings = new Repository(db, schema.SETTINGS);
  }

  transaction(fn) {
    return this.db.transaction((tx) => fn(new Repositories(tx)));
  }
}
