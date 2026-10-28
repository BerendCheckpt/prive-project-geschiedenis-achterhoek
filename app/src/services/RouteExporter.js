const xml = (s) => String(s ?? '').replace(/[<>&'"]/g, (c) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
}[c]));

const coord = (p) => `${Number(p.lat).toFixed(6)},${Number(p.lon).toFixed(6)}`;

const APPLE_FLAGS = { walking: 'w', bicycling: 'c', driving: 'd' };

/**
 * Turns a route and its ordered stops into a GPX file or deep links for Google Maps and
 * Apple Maps. Map apps accept a limited number of stops per link, so long routes are
 * split into consecutive legs.
 */
export class RouteExporter {
  static TRAVEL_MODES = ['walking', 'bicycling', 'driving'];

  constructor({ maxStopsPerLink = 10 } = {}) {
    this.maxStopsPerLink = maxStopsPerLink;
  }

  /** Legs of at most maxStopsPerLink stops; each leg starts where the previous one ended. */
  legs(stops) {
    const size = this.maxStopsPerLink;
    if (stops.length <= size) return [stops];
    const result = [];
    for (let start = 0; start < stops.length - 1; start += size - 1) result.push(stops.slice(start, start + size));
    return result;
  }

  googleMapsUrls(stops, mode = 'walking') {
    if (stops.length < 2) return stops.map((p) => `https://www.google.com/maps/search/?api=1&query=${coord(p)}`);
    return this.legs(stops).map((leg) => {
      const params = new URLSearchParams({
        api: '1', origin: coord(leg[0]), destination: coord(leg.at(-1)), travelmode: mode,
      });
      if (leg.length > 2) params.set('waypoints', leg.slice(1, -1).map(coord).join('|'));
      return `https://www.google.com/maps/dir/?${params}`;
    });
  }

  /** saddr + daddr with "+to:" between extra stops (multi-stop needs iOS 16 or newer). */
  appleMapsUrls(stops, mode = 'walking') {
    if (stops.length < 2) return stops.map((p) => `https://maps.apple.com/?ll=${coord(p)}&q=${encodeURIComponent(p.title ?? '')}`);
    return this.legs(stops).map((leg) =>
      `https://maps.apple.com/?saddr=${coord(leg[0])}&daddr=${leg.slice(1).map(coord).join('+to:')}&dirflg=${APPLE_FLAGS[mode] ?? 'w'}`);
  }

  /** GPX 1.1: a waypoint per stop plus a route through the stops in order. */
  gpx(route, stops, baseUrl = '') {
    const point = (tag, p, indent) => [
      `${indent}<${tag} lat="${p.lat}" lon="${p.lon}">`,
      `${indent}  <name>${xml(p.title)}</name>`,
      p.summary ? `${indent}  <desc>${xml(p.summary)}</desc>` : null,
      baseUrl ? `${indent}  <link href="${xml(`${baseUrl}/pin.html?id=${p.id}`)}"><text>${xml(p.title)}</text></link>` : null,
      `${indent}</${tag}>`,
    ].filter(Boolean).join('\n');

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<gpx version="1.1" creator="Geschiedenis Achterhoek" xmlns="http://www.topografix.com/GPX/1/1">',
      '  <metadata>',
      `    <name>${xml(route.title)}</name>`,
      route.description ? `    <desc>${xml(route.description)}</desc>` : null,
      '  </metadata>',
      ...stops.map((p) => point('wpt', p, '  ')),
      '  <rte>',
      `    <name>${xml(route.title)}</name>`,
      ...stops.map((p) => point('rtept', p, '    ')),
      '  </rte>',
      '</gpx>',
      '',
    ].filter((line) => line !== null).join('\n');
  }
}
