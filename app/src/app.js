import express from 'express';
import { errorHandler, notFound } from './errors.js';
import { securityHeaders } from './security.js';
import { loadUser, sessionMiddleware } from './http/middleware.js';
import { authRouter } from './http/routers/authRouter.js';
import { pinRouter } from './http/routers/pinRouter.js';
import { routeRouter } from './http/routers/routeRouter.js';
import { mediaRouter } from './http/routers/mediaRouter.js';
import { favoriteRouter } from './http/routers/favoriteRouter.js';
import { lookupRouter } from './http/routers/lookupRouter.js';
import { settingsRouter, userRouter } from './http/routers/adminRouters.js';

/** @param {ReturnType<import('./container.js').createContainer>} container */
export function createApp({ config, db, services, storage }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(securityHeaders);

  app.get('/healthz', async (req, res) => {
    await db.query('SELECT 1');
    res.json({ ok: true });
  });

  // The active theme; pages link /theme.css instead of a fixed w3-theme file.
  app.get('/theme.css', async (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(services.theme.fileName(await services.theme.current()), { root: services.theme.themeDir });
  });

  app.use('/media', express.static(config.mediaDir, {
    index: false,
    fallthrough: false,
    setHeaders: (res) => res.set('Content-Security-Policy', "default-src 'none'; sandbox"),
  }));
  app.use(express.static(config.publicDir, { extensions: ['html'] }));

  const api = express.Router();
  api.use(express.json({ limit: '1mb' }));
  api.use(sessionMiddleware(db.pool, { secret: config.sessionSecret, secure: config.secureCookies }));
  api.use(loadUser(services.auth));
  api.use('/auth', authRouter(services));
  api.use('/pins', pinRouter(services));
  api.use('/routes', routeRouter(services));
  api.use('/favorites', favoriteRouter(services));
  api.use('/categories', lookupRouter(services.categories, 'categories'));
  api.use('/periods', lookupRouter(services.periods, 'periods'));
  api.use('/settings', settingsRouter(services));
  api.use('/users', userRouter(services));
  api.use(mediaRouter(services, storage));
  api.use((req, res, next) => next(notFound()));
  app.use('/api', api);

  app.use(errorHandler);
  return app;
}
