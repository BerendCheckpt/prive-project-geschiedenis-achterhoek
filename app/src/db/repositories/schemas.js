// Table definitions used by the repositories. Keep in sync with db/migrations.

export const USERS = {
  table: 'users',
  columns: ['id', 'username', 'email', 'display_name', 'password_hash', 'role', 'created_at'],
};

export const PINS = {
  table: 'pins',
  columns: ['id', 'owner_id', 'title', 'summary', 'body', 'lat', 'lon', 'place_name',
    'year_start', 'year_end', 'published', 'created_at', 'updated_at'],
};

export const MEDIA = {
  table: 'media',
  columns: ['id', 'pin_id', 'kind', 'file_name', 'original_name', 'mime', 'size', 'caption', 'sort_order', 'created_at'],
};

export const CATEGORIES = { table: 'categories', columns: ['id', 'name'] };

export const PERIODS = { table: 'periods', columns: ['id', 'name', 'year_start', 'year_end'] };

export const PIN_CATEGORIES = { table: 'pin_categories', columns: ['pin_id', 'category_id'], key: 'pin_id' };

export const PIN_PERIODS = { table: 'pin_periods', columns: ['pin_id', 'period_id'], key: 'pin_id' };

export const ROUTES = {
  table: 'routes',
  columns: ['id', 'owner_id', 'title', 'description', 'published', 'created_at', 'updated_at'],
};

export const ROUTE_PINS = { table: 'route_pins', columns: ['route_id', 'pin_id', 'position'], key: 'route_id' };

export const FAVORITES = { table: 'favorites', columns: ['user_id', 'pin_id', 'created_at'], key: 'user_id' };

export const SETTINGS = { table: 'settings', columns: ['key', 'value'], key: 'key' };
