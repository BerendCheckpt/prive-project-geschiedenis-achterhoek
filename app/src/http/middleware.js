import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { HttpError } from '../errors.js';
import { hasRole } from '../auth/roles.js';

const PgStore = connectPgSimple(session);

export const SESSION_COOKIE = 'ga.sid';

/** Sessions live in PostgreSQL so several app instances can share them. */
export function sessionMiddleware(pool, { secret, secure }) {
  return session({
    store: new PgStore({ pool, tableName: 'session' }),
    name: SESSION_COOKIE,
    secret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { httpOnly: true, sameSite: 'lax', secure, maxAge: 1000 * 60 * 60 * 24 * 30 },
  });
}

/** Sets req.user, loaded fresh per request so role changes apply immediately. */
export const loadUser = (auth) => async (req, res, next) => {
  req.user = req.session?.userId ? await auth.findUser(req.session.userId) : null;
  next();
};

export const requireRole = (minRole) => (req, res, next) => {
  if (!req.user) return next(new HttpError(401, 'Je bent niet ingelogd'));
  if (!hasRole(req.user, minRole)) return next(new HttpError(403, 'Geen toegang'));
  next();
};
