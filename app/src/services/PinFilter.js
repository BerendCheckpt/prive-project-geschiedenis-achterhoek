import { ids, int, num, text } from '../validate.js';
import { badRequest } from '../errors.js';

/**
 * Filters shared by the pin and route overviews, parsed from a query string:
 *   q, place, near=lat,lon, radius (km), bbox=minLon,minLat,maxLon,maxLat,
 *   period (ids), yearFrom, yearTo, category (ids), route (ids), favorites=1
 */
export class PinFilter {
  constructor(values = {}) {
    this.q = values.q ?? null;
    this.place = values.place ?? null;
    this.near = values.near ?? null;
    this.bbox = values.bbox ?? null;
    this.periods = values.periods ?? [];
    this.yearFrom = values.yearFrom ?? null;
    this.yearTo = values.yearTo ?? null;
    this.categories = values.categories ?? [];
    this.routes = values.routes ?? [];
    this.favorites = values.favorites ?? false;
  }

  static fromQuery(qs = {}) {
    const values = {
      q: text(qs.q, 'Zoekterm', { max: 200 }),
      place: text(qs.place, 'Plaats', { max: 200 }),
      periods: ids(qs.period),
      categories: ids(qs.category),
      routes: ids(qs.route),
      yearFrom: int(qs.yearFrom, 'Jaar vanaf'),
      yearTo: int(qs.yearTo, 'Jaar tot'),
      favorites: qs.favorites === '1' || qs.favorites === 'true',
    };
    if (qs.near) {
      const [lat, lon] = String(qs.near).split(',');
      values.near = {
        lat: num(lat, 'Breedtegraad', { required: true, min: -90, max: 90 }),
        lon: num(lon, 'Lengtegraad', { required: true, min: -180, max: 180 }),
        radius: num(qs.radius, 'Straal', { min: 0.1, max: 500 }) ?? 5,
      };
    }
    if (qs.bbox) {
      const parts = String(qs.bbox).split(',').map(Number);
      if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) throw badRequest('Ongeldige bbox');
      values.bbox = parts;
    }
    return new PinFilter(values);
  }

  get isEmpty() {
    return !(this.q || this.place || this.near || this.bbox || this.periods.length || this.categories.length
      || this.routes.length || this.yearFrom !== null || this.yearTo !== null || this.favorites);
  }
}
