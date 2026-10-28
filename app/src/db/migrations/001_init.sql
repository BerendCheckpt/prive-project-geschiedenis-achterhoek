CREATE TYPE user_role AS ENUM ('user', 'mapper', 'maintainer', 'admin');
CREATE TYPE media_kind AS ENUM ('image', 'audio', 'video');

CREATE TABLE users (
  id            serial PRIMARY KEY,
  username      text NOT NULL UNIQUE,
  email         text UNIQUE,
  display_name  text,
  password_hash text NOT NULL,
  role          user_role NOT NULL DEFAULT 'user',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- connect-pg-simple session store
CREATE TABLE "session" (
  sid    varchar NOT NULL PRIMARY KEY,
  sess   json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX session_expire_idx ON "session" (expire);

CREATE TABLE pins (
  id          serial PRIMARY KEY,
  owner_id    integer NOT NULL REFERENCES users (id),
  title       text NOT NULL,
  summary     text,
  body        text,
  lat         double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lon         double precision NOT NULL CHECK (lon BETWEEN -180 AND 180),
  place_name  text,
  year_start  integer,
  year_end    integer,
  published   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (year_end IS NULL OR year_start IS NULL OR year_end >= year_start)
);
CREATE INDEX pins_lat_lon_idx ON pins (lat, lon);

CREATE TABLE media (
  id            serial PRIMARY KEY,
  pin_id        integer NOT NULL REFERENCES pins (id) ON DELETE CASCADE,
  kind          media_kind NOT NULL,
  file_name     text NOT NULL,
  original_name text,
  mime          text NOT NULL,
  size          bigint NOT NULL,
  caption       text,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_pin_idx ON media (pin_id);

CREATE TABLE categories (
  id   serial PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE pin_categories (
  pin_id      integer NOT NULL REFERENCES pins (id) ON DELETE CASCADE,
  category_id integer NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  PRIMARY KEY (pin_id, category_id)
);

CREATE TABLE periods (
  id         serial PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  year_start integer NOT NULL,
  year_end   integer NOT NULL,
  CHECK (year_end >= year_start)
);

CREATE TABLE pin_periods (
  pin_id    integer NOT NULL REFERENCES pins (id) ON DELETE CASCADE,
  period_id integer NOT NULL REFERENCES periods (id) ON DELETE CASCADE,
  PRIMARY KEY (pin_id, period_id)
);

CREATE TABLE routes (
  id          serial PRIMARY KEY,
  owner_id    integer NOT NULL REFERENCES users (id),
  title       text NOT NULL,
  description text,
  published   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE route_pins (
  route_id integer NOT NULL REFERENCES routes (id) ON DELETE CASCADE,
  pin_id   integer NOT NULL REFERENCES pins (id) ON DELETE CASCADE,
  position integer NOT NULL,
  PRIMARY KEY (route_id, pin_id)
);
CREATE INDEX route_pins_pin_idx ON route_pins (pin_id);

CREATE TABLE favorites (
  user_id    integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  pin_id     integer NOT NULL REFERENCES pins (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pin_id)
);

CREATE TABLE settings (
  key   text PRIMARY KEY,
  value jsonb NOT NULL
);
INSERT INTO settings (key, value) VALUES ('theme', '{"name": "green"}');
