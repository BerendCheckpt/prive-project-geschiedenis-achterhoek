export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** JSON client for the /api endpoints. */
export class ApiClient {
  constructor(base = '/api') {
    this.base = base;
  }

  async request(path, { method = 'GET', body, form, params } = {}) {
    const options = { method, headers: { Accept: 'application/json' }, credentials: 'same-origin' };
    if (form) options.body = form;
    else if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    const query = params && String(params) ? `?${params}` : '';
    const res = await fetch(`${this.base}${path}${query}`, options);
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, data?.error || res.statusText);
    return data;
  }

  get(path, params) { return this.request(path, { params }); }
  post(path, body) { return this.request(path, { method: 'POST', body }); }
  put(path, body) { return this.request(path, { method: 'PUT', body }); }
  delete(path) { return this.request(path, { method: 'DELETE' }); }
  upload(path, form) { return this.request(path, { method: 'POST', form }); }
}

export const api = new ApiClient();
