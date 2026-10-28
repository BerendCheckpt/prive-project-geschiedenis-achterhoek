import { Router } from 'express';
import { id } from '../../validate.js';
import { requireRole } from '../middleware.js';

/**
 * @param {{ media: import('../../services/MediaService.js').MediaService }} services
 * @param {import('../../services/MediaStorage.js').MediaStorage} storage
 */
export function mediaRouter({ media }, storage) {
  const router = Router();

  router.post(
    '/pins/:id/media',
    requireRole('mapper'),
    async (req, res, next) => {
      await media.assertCanUpload(id(req.params.id), req.user);
      next();
    },
    storage.uploadMiddleware(),
    async (req, res) => {
      res.status(201).json({ media: await media.addUploaded(id(req.params.id), req.files, req.body.caption) });
    },
  );

  router.put('/media/:id', requireRole('mapper'), async (req, res) => {
    res.json({ media: await media.update(id(req.params.id), req.body, req.user) });
  });

  router.delete('/media/:id', requireRole('mapper'), async (req, res) => {
    await media.remove(id(req.params.id), req.user);
    res.status(204).end();
  });

  return router;
}
