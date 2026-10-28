export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const notFound = (what = 'Niet gevonden') => new HttpError(404, what);
export const forbidden = () => new HttpError(403, 'Geen toegang');
export const badRequest = (msg) => new HttpError(400, msg);

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') err = new HttpError(413, 'Bestand is te groot');
  else if (err.code === '23505') err = new HttpError(409, 'Bestaat al');
  else if (err.code === '23503') err = new HttpError(400, 'Verwijst naar een onbekend item');
  else if (err.type === 'entity.parse.failed') err = new HttpError(400, 'Ongeldige JSON');
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Interne serverfout' : err.message });
}
