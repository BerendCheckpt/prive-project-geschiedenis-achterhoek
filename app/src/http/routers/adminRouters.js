import { Router } from 'express';
import { id, text } from '../../validate.js';
import { requireRole } from '../middleware.js';

/** @param {{ theme: import('../../services/ThemeService.js').ThemeService }} services */
export function settingsRouter({ theme }) {
  const router = Router();

  router.get('/theme', async (req, res) => res.json({ name: await theme.current(), available: theme.available() }));

  router.put('/theme', requireRole('maintainer'), async (req, res) => {
    res.json({ name: await theme.set(text(req.body.name, 'Thema', { required: true, max: 50 })) });
  });

  return router;
}

/** @param {{ users: import('../../services/UserService.js').UserService }} services */
export function userRouter({ users }) {
  const router = Router();
  router.use(requireRole('admin'));

  router.get('/', async (req, res) => res.json({ users: await users.list() }));

  router.put('/:id/role', async (req, res) => {
    res.json({ user: await users.setRole(id(req.params.id), req.body.role) });
  });

  return router;
}
