import { badRequest } from './errors.js';

/** Small input validators; each throws a 400 HttpError with a Dutch message. */

export function text(value, label, { required = false, max = 10000 } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) throw badRequest(`${label} is verplicht`);
    return null;
  }
  const s = String(value).trim();
  if (s.length > max) throw badRequest(`${label} is te lang (max ${max} tekens)`);
  return s;
}

export function int(value, label, { required = false, min = -100000, max = 100000 } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw badRequest(`${label} is verplicht`);
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw badRequest(`${label} is geen geldig getal`);
  return n;
}

export function num(value, label, { required = false, min = -Infinity, max = Infinity } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw badRequest(`${label} is verplicht`);
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw badRequest(`${label} is geen geldig getal`);
  return n;
}

export const bool = (value, fallback = false) => (value === undefined ? fallback : value === true || value === 'true');

/** Accepts [1,2], "1,2" or 1 and returns a de-duplicated array of positive ints. */
export function ids(value) {
  if (value === undefined || value === null || value === '') return [];
  const list = Array.isArray(value) ? value : String(value).split(',');
  return [...new Set(list.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
}

export function id(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw badRequest('Ongeldig id');
  return n;
}
