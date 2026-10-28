import { Router } from 'express';
import { id } from '../../validate.js';
import { requireRole } from '../middleware.js';

/**
 * Public read, maintainer write — reused for categories and periods.
 * @param {import('../../services/LookupService.js').LookupService} service
 * @param {string} key JSON property name of the list, e.g. "categories"
 */
export function lookupRouter(service, key) {
  const router = Router();

  router.get('/', async (req, res) => res.json({ [key]: await service.list() }));

  router.post('/', requireRole('maintainer'), async (req, res) => {
    res.status(201).json({ item: await service.create(req.body) });
  });

  router.put('/:id', requireRole('maintainer'), async (req, res) => {
    res.json({ item: await service.update(id(req.params.id), req.body) });
  });

  router.delete('/:id', requireRole('maintainer'), async (req, res) => {
    await service.remove(id(req.params.id));
    res.status(204).end();
  });

  return router;
}
