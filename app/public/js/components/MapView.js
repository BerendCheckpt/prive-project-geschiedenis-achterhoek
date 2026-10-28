/* global ol */
import { PinCard } from './PinCard.js';

const ACHTERHOEK = [6.55, 51.95]; // lon, lat

/**
 * OpenLayers map on OpenStreetMap tiles with layers for pins, a route line and the
 * user's position. Colours are read from the active W3.CSS theme.
 */
export class MapView {
  /**
   * @param {HTMLElement|string} target
   * @param {{ center?: number[], zoom?: number, cluster?: boolean, popups?: boolean }} options
   */
  constructor(target, { center = ACHTERHOEK, zoom = 10, cluster = true, popups = true } = {}) {
    this.colors = { pin: MapView.themeColor('w3-theme'), dark: MapView.themeColor('w3-theme-d3'), route: MapView.themeColor('w3-theme-d1') };
    this.styleCache = new Map();
    this.pinSource = new ol.source.Vector();
    this.routeSource = new ol.source.Vector();
    this.locationSource = new ol.source.Vector();
    this.numbered = false;

    const pinLayerSource = cluster ? new ol.source.Cluster({ distance: 40, source: this.pinSource }) : this.pinSource;
    this.map = new ol.Map({
      target,
      layers: [
        new ol.layer.Tile({ source: new ol.source.OSM() }),
        new ol.layer.Vector({ source: this.routeSource, style: () => this.routeStyle() }),
        new ol.layer.Vector({ source: pinLayerSource, style: (f) => this.pinStyle(f) }),
        new ol.layer.Vector({ source: this.locationSource }),
      ],
      view: new ol.View({ center: ol.proj.fromLonLat(center), zoom, maxZoom: 19 }),
    });

    if (popups) this.createPopup();
    this.map.on('singleclick', (e) => this.handleClick(e));
    this.map.on('pointermove', (e) => {
      this.map.getTargetElement().style.cursor = this.map.hasFeatureAtPixel(e.pixel) ? 'pointer' : '';
    });
  }

  /** Background colour of an element with the given W3 class. */
  static themeColor(className) {
    const el = document.createElement('div');
    el.className = className;
    el.hidden = true;
    document.body.append(el);
    const color = getComputedStyle(el).backgroundColor;
    el.remove();
    return color;
  }

  static toCoord(item) {
    return ol.proj.fromLonLat([Number(item.lon), Number(item.lat)]);
  }

  // --- pins ---

  /** @param {object[]} pins objects with id, lat, lon, title */
  setPins(pins, { fit = false, numbered = false } = {}) {
    this.numbered = numbered;
    this.pinSource.clear();
    this.pinSource.addFeatures(pins.map((pin, i) => {
      const feature = new ol.Feature({ geometry: new ol.geom.Point(MapView.toCoord(pin)), pin, index: i + 1 });
      feature.setId(pin.id);
      return feature;
    }));
    if (fit && pins.length) this.fit(this.pinSource);
  }

  pinStyle(feature) {
    const members = feature.get('features');
    const count = members ? members.length : 1;
    const single = members ? members[0] : feature;
    const label = count > 1 ? String(count) : this.numbered ? String(single.get('index')) : '';
    const key = `${count > 1 ? 'c' : 'p'}${label}`;
    if (!this.styleCache.has(key)) {
      const radius = count > 1 ? 12 + Math.min(count, 20) / 2 : label ? 12 : 8;
      this.styleCache.set(key, new ol.style.Style({
        image: new ol.style.Circle({
          radius,
          fill: new ol.style.Fill({ color: count > 1 ? this.colors.dark : this.colors.pin }),
          stroke: new ol.style.Stroke({ color: '#fff', width: 2 }),
        }),
        text: label ? new ol.style.Text({ text: label, fill: new ol.style.Fill({ color: '#fff' }), font: 'bold 12px sans-serif' }) : undefined,
      }));
    }
    return this.styleCache.get(key);
  }

  /** Called with the pin object when a single pin is clicked. Default: show a popup. */
  onPinClick(callback) {
    this.pinClickHandler = callback;
  }

  handleClick(event) {
    if (this.pickHandler) {
      const [lon, lat] = ol.proj.toLonLat(event.coordinate);
      this.setMarker(lat, lon);
      this.pickHandler({ lat, lon });
      return;
    }
    const feature = this.map.forEachFeatureAtPixel(event.pixel, (f) => (f.get('pin') || f.get('features') ? f : null));
    if (!feature) return this.closePopup();
    const members = feature.get('features');
    if (members && members.length > 1) {
      const extent = ol.extent.boundingExtent(members.map((m) => m.getGeometry().getCoordinates()));
      this.map.getView().fit(extent, { padding: [60, 60, 60, 60], duration: 300, maxZoom: 17 });
      return;
    }
    const pin = (members ? members[0] : feature).get('pin');
    if (this.pinClickHandler) this.pinClickHandler(pin);
    else this.showPopup(pin);
  }

  // --- popup ---

  createPopup() {
    this.popupElement = document.createElement('div');
    this.popupElement.className = 'w3-card-4 w3-white w3-round app-popup ol-popup-anchor';
    this.popup = new ol.Overlay({ element: this.popupElement, autoPan: { animation: { duration: 250 } } });
    this.map.addOverlay(this.popup);
  }

  showPopup(pin) {
    if (!this.popup) return;
    this.popupElement.innerHTML = PinCard.popup(pin);
    this.popupElement.querySelector('[data-close]')?.addEventListener('click', () => this.closePopup());
    this.popup.setPosition(MapView.toCoord(pin));
  }

  closePopup() {
    this.popup?.setPosition(undefined);
  }

  // --- routes ---

  showRoute(stops) {
    this.routeSource.clear();
    this.setPins(stops, { numbered: true });
    if (stops.length > 1) {
      this.routeSource.addFeature(new ol.Feature(new ol.geom.LineString(stops.map(MapView.toCoord))));
    }
    if (stops.length) this.fit(this.pinSource);
  }

  routeStyle() {
    return (this.routeStyleValue ??= new ol.style.Style({
      stroke: new ol.style.Stroke({ color: this.colors.route, width: 4, lineDash: [10, 8] }),
    }));
  }

  fit(source) {
    this.map.getView().fit(source.getExtent(), { padding: [50, 50, 50, 50], maxZoom: 15, duration: 300 });
  }

  // --- picking a location (content editors) ---

  enablePicking(callback) {
    this.pickHandler = callback;
  }

  setMarker(lat, lon, { center = false } = {}) {
    this.setPins([{ id: 'marker', lat, lon, title: '' }]);
    if (center) this.map.getView().animate({ center: MapView.toCoord({ lat, lon }), zoom: Math.max(this.map.getView().getZoom(), 13) });
  }

  // --- the user's position ---

  /**
   * Follows the device position (needs HTTPS or localhost).
   * @param {{ follow?: boolean, onPosition?: (p: {lat:number, lon:number, accuracy:number}) => void, onError?: (e) => void }} options
   */
  startTracking({ follow = true, onPosition, onError } = {}) {
    this.stopTracking();
    const position = new ol.Feature();
    position.setStyle(new ol.style.Style({
      image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({ color: '#1e88e5' }),
        stroke: new ol.style.Stroke({ color: '#fff', width: 3 }),
      }),
    }));
    const accuracy = new ol.Feature();
    this.locationSource.addFeatures([accuracy, position]);

    this.geolocation = new ol.Geolocation({
      tracking: true,
      trackingOptions: { enableHighAccuracy: true, maximumAge: 5000 },
      projection: this.map.getView().getProjection(),
    });
    this.geolocation.on('change:accuracyGeometry', () => accuracy.setGeometry(this.geolocation.getAccuracyGeometry()));
    this.geolocation.on('change:position', () => {
      const coord = this.geolocation.getPosition();
      position.setGeometry(coord ? new ol.geom.Point(coord) : null);
      if (!coord) return;
      if (follow) this.map.getView().animate({ center: coord, duration: 300 });
      const [lon, lat] = ol.proj.toLonLat(coord);
      onPosition?.({ lat, lon, accuracy: this.geolocation.getAccuracy() });
    });
    this.geolocation.on('error', (e) => onError?.(e));
  }

  stopTracking() {
    if (this.geolocation) this.geolocation.setTracking(false);
    this.geolocation = null;
    this.locationSource.clear();
  }

  /** Distance in metres between two {lat, lon} points. */
  static distance(a, b) {
    return ol.sphere.getDistance([a.lon, a.lat], [b.lon, b.lat]);
  }

  updateSize() {
    this.map.updateSize();
  }
}
