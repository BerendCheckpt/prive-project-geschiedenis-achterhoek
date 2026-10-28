const TILE_HOSTS = 'https://tile.openstreetmap.org https://*.tile.openstreetmap.org';

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // OpenLayers sets inline styles on its controls and overlays
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${TILE_HOSTS}`,
  `connect-src 'self' ${TILE_HOSTS}`,
  "media-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export function securityHeaders(req, res, next) {
  res.set({
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin', // OSM tile policy needs a referrer
    'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'geolocation=(self), camera=(), microphone=()',
  });
  next();
}
