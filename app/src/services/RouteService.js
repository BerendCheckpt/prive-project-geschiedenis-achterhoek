import { canEdit } from '../auth/roles.js';
import { badRequest, forbidden, notFound } from '../errors.js';
import { PinCriteria } from '../db/repositories/PinCriteria.js';
import { bool, ids, text } from '../validate.js';
import { PinFilter } from './PinFilter.js';
import { PinService } from './PinService.js';
import { RouteExporter } from './RouteExporter.js';

const NOT_FOUND = 'Route niet gevonden';

export class RouteService {
  /** @param {import('../db/repositories/Repositories.js').Repositories} repos */
  constructor(repos, exporter = new RouteExporter()) {
    this.repos = repos;
    this.exporter = exporter;
  }

  static parseInput(body) {
    return {
      route: {
        title: text(body.title, 'Titel', { required: true, max: 200 }),
        description: text(body.description, 'Beschrijving', { max: 5000 }),
        published: bool(body.published, true),
      },
      pinIds: ids(body.pinIds),
    };
  }

  /** Same filters as pins, except `pin` (ids) replaces `route`. */
  list(query, user) {
    const scope = PinService.scopeFor(query, user);
    const filter = PinFilter.fromQuery({ ...query, route: undefined });
    return this.repos.routes.search({
      ...scope,
      pinIds: ids(query.pin),
      pinCriteria: filter.isEmpty ? null : new PinCriteria(filter, { publishedOnly: true, userId: user?.id }),
    });
  }

  async get(id, user) {
    const route = await this.repos.routes.findById(id);
    const editable = route && canEdit(user, route);
    if (!route || (!route.published && !editable)) throw notFound(NOT_FOUND);
    const stops = await this.repos.routes.stops(id, { publishedOnly: !editable });
    return { ...route, stops, can_edit: !!editable };
  }

  async findEditable(id, user) {
    const route = await this.repos.routes.findById(id);
    if (!route) throw notFound(NOT_FOUND);
    if (!canEdit(user, route)) throw forbidden();
    return route;
  }

  /** A route may contain published pins and the user's own pins. */
  async assertUsablePins(pinIds, user) {
    if (!pinIds.length) return;
    const pins = await this.repos.pins.findAll({ id: pinIds });
    const usable = pins.filter((p) => p.published || canEdit(user, p));
    if (usable.length !== pinIds.length) throw badRequest('Route bevat onbekende of niet-gepubliceerde verhalen');
  }

  async create(body, user) {
    const { route, pinIds } = RouteService.parseInput(body);
    await this.assertUsablePins(pinIds, user);
    return this.repos.transaction(async (r) => {
      const created = await r.routes.insert({ ...route, owner_id: user.id });
      await RouteService.saveStops(r, created.id, pinIds);
      return created;
    });
  }

  async update(id, body, user) {
    await this.findEditable(id, user);
    const { route, pinIds } = RouteService.parseInput(body);
    await this.assertUsablePins(pinIds, user);
    return this.repos.transaction(async (r) => {
      const updated = await r.routes.updateById(id, { ...route, updated_at: new Date() });
      await RouteService.saveStops(r, id, pinIds);
      return updated;
    });
  }

  async remove(id, user) {
    await this.findEditable(id, user);
    await this.repos.routes.deleteById(id);
  }

  async gpx(id, user, baseUrl) {
    const route = await this.get(id, user);
    return { route, gpx: this.exporter.gpx(route, route.stops, baseUrl) };
  }

  async links(id, user, mode = 'walking') {
    if (!RouteExporter.TRAVEL_MODES.includes(mode)) throw badRequest('Onbekende vervoerswijze');
    const { stops } = await this.get(id, user);
    return {
      google: this.exporter.googleMapsUrls(stops, mode),
      apple: this.exporter.appleMapsUrls(stops, mode),
    };
  }

  static async saveStops(r, routeId, pinIds) {
    await r.routePins.delete({ route_id: routeId });
    await r.routePins.insertMany(pinIds.map((pin_id, position) => ({ route_id: routeId, pin_id, position })));
  }
}
