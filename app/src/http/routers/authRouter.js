import { Router } from 'express';
import { AuthService } from '../../services/AuthService.js';
import { SESSION_COOKIE, requireRole } from '../middleware.js';

/** Starts a fresh session for the user (prevents session fixation). */
function startSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = userId;
      req.session.save((e) => (e ? reject(e) : resolve()));
    });
  });
}

/** @param {{ auth: AuthService }} services */
export function authRouter({ auth }) {
  const router = Router();

  router.get('/me', (req, res) => res.json({ user: AuthService.toPublic(req.user) }));

  router.post('/register', async (req, res) => {
    const user = await auth.register(req.body);
    await startSession(req, user.id);
    res.status(201).json({ user: AuthService.toPublic(user) });
  });

  router.post('/login', async (req, res) => {
    const user = await auth.authenticate(req.body);
    await startSession(req, user.id);
    res.json({ user: AuthService.toPublic(user) });
  });

  router.post('/logout', (req, res, next) => {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie(SESSION_COOKIE);
      res.status(204).end();
    });
  });

  router.put('/password', requireRole('user'), async (req, res) => {
    await auth.changePassword(req.user.id, req.body);
    res.status(204).end();
  });

  return router;
}
