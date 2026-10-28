import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const production = process.env.NODE_ENV === 'production';

if (production && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is verplicht in productie');
}

const config = {
  production,
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL || 'postgres://geschiedenis:geschiedenis@localhost:5432/geschiedenis',
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-session-secret',
  secureCookies: process.env.SECURE_COOKIES === 'true',
  mediaDir: path.resolve(process.env.MEDIA_DIR || path.join(appDir, '..', 'data', 'media')),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 200,
  seedDemo: process.env.SEED_DEMO === 'true',
  publicDir: path.join(appDir, 'public'),
};

export default config;
