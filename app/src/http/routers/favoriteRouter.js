import { Router } from 'express';
import { id } from '../../validate.js';
import { requireRole } from '../middleware.js';

/** @param {{ favorites: import('../../services/FavoriteService.js').FavoriteService }} services */
export function favoriteRouter({ favorites }) {
  const router = Router();
  router.use(requireRole('user'));

  router.get('/', async (req, res) => res.json({ pinIds: await favorites.pinIds(req.user.id) }));

  router.put('/:pinId', async (req, res) => {
    await favorites.add(req.user.id, id(req.params.pinId));
    res.status(204).end();
  });

  router.delete('/:pinId', async (req, res) => {
    await favorites.remove(req.user.id, id(req.params.pinId));
    res.status(204).end();
  });

  return router;
}
