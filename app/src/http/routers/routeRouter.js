import { Router } from 'express';
import { id } from '../../validate.js';
import { requireRole } from '../middleware.js';

const fileName = (title) => `${title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 60) || 'route'}.gpx`;

/** @param {{ routes: import('../../services/RouteService.js').RouteService }} services */
export function routeRouter({ routes }) {
  const router = Router();

  router.get('/', async (req, res) => res.json({ routes: await routes.list(req.query, req.user) }));

  router.get('/:id', async (req, res) => res.json({ route: await routes.get(id(req.params.id), req.user) }));

  router.get('/:id/export.gpx', async (req, res) => {
    const { route, gpx } = await routes.gpx(id(req.params.id), req.user, `${req.protocol}://${req.get('host')}`);
    res.type('application/gpx+xml').attachment(fileName(route.title)).send(gpx);
  });

  router.get('/:id/links', async (req, res) => {
    res.json(await routes.links(id(req.params.id), req.user, req.query.mode || undefined));
  });

  router.post('/', requireRole('mapper'), async (req, res) => {
    res.status(201).json({ route: await routes.create(req.body, req.user) });
  });

  router.put('/:id', requireRole('mapper'), async (req, res) => {
    res.json({ route: await routes.update(id(req.params.id), req.body, req.user) });
  });

  router.delete('/:id', requireRole('mapper'), async (req, res) => {
    await routes.remove(id(req.params.id), req.user);
    res.status(204).end();
  });

  return router;
}
