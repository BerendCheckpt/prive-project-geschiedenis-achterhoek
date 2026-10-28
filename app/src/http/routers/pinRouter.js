import { Router } from 'express';
import { id } from '../../validate.js';
import { requireRole } from '../middleware.js';

/** @param {{ pins: import('../../services/PinService.js').PinService }} services */
export function pinRouter({ pins }) {
  const router = Router();

  router.get('/', async (req, res) => res.json({ pins: await pins.list(req.query, req.user) }));

  router.get('/:id', async (req, res) => res.json({ pin: await pins.get(id(req.params.id), req.user) }));

  router.post('/', requireRole('mapper'), async (req, res) => {
    res.status(201).json({ pin: await pins.create(req.body, req.user) });
  });

  router.put('/:id', requireRole('mapper'), async (req, res) => {
    res.json({ pin: await pins.update(id(req.params.id), req.body, req.user) });
  });

  router.delete('/:id', requireRole('mapper'), async (req, res) => {
    await pins.remove(id(req.params.id), req.user);
    res.status(204).end();
  });

  return router;
}
