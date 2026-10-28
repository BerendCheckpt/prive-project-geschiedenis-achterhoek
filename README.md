# Geschiedenis Achterhoek

Web app (also for phones) that tells stories about historical events in the Achterhoek. Stories ("verhalen") are pins on an
OpenStreetMap map with text, photos, audio and video. Mappers group pins into routes; visitors can follow a route with live
location in the browser, or export it as GPX, Google Maps or Apple Maps.

## Quick start (Podman)

```sh
cp .env.example .env        # set POSTGRES_PASSWORD and SESSION_SECRET
podman-compose up -d --build  # or: podman compose up -d --build
```

Open http://localhost:3000 and log in as **admin / admin**. **Change that password straight away** (Account page) before
the site is reachable by anyone else. On an empty database a few example stories and a route are added
(`SEED_DEMO=true`); remove or replace them.

Uploaded media is stored in the host folder `MEDIA_HOST_DIR` (default `./data/media`); the database lives in the `db-data` volume.

Live location on phones only works over **https** (or on localhost). Put a TLS reverse proxy in front and set `SECURE_COOKIES=true`.

## Roles

| Role | Can |
|---|---|
| User | create an account, save favourite stories, use map, stories and routes |
| Mapper | + create stories (pins) and routes, manage their own content |
| Maintainer ("Onderhouder") | + manage categories, periods and the site theme |
| Admin ("Beheerder") | everything, including other people's content and user roles |

Anyone can register as User; an admin promotes accounts on *Beheer → Gebruikers*.

## Features

- Map with clustered pins; filters for text, place, near me (radius), named periods, free year range, categories,
  favourites and route. Routes have the same filters, with "contains story" instead of route.
- Overview pages for stories and routes; detail pages with media, map and the routes a story is part of.
- Route page: numbered stops, "follow route" with live position and distance to the next stop, exports.
- Management pages for stories (with uploads), routes (ordered stop picker), categories, periods, theme and users.
- Theme: any W3.CSS colour theme (default `w3-theme-green`), chosen by a maintainer and applied site-wide via `/theme.css`.

## Development

Requires Node.js 22+ and PostgreSQL.

```sh
cd app
npm install
DATABASE_URL=postgres://user:pass@localhost:5432/geschiedenis SEED_DEMO=true npm run dev
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/geschiedenis_test npm test   # wipes that database
```

### Structure

```
app/
  server.js                    start: migrate, seed admin, listen
  src/container.js             composition root (builds repositories and services)
  src/app.js                   Express app: static files, /theme.css, /media, /api
  src/db/Database.js           pg pool wrapper with transactions
  src/db/repositories/         all SQL: generic Repository + Pin/Route/User repositories
  src/db/migrations/           numbered SQL migrations
  src/services/                business rules (PinService, RouteService, AuthService, ...)
  src/http/                    thin routers and middleware
  public/                      static front-end (W3.CSS, W3.JS, OpenLayers – all vendored)
    components/                shared HTML fragments (navbar, footer)
    js/core|components|pages   ES-module classes
  test/                        node:test unit + API tests
Containerfile, compose.yaml    Podman setup
```

See [CLAUDE.md](CLAUDE.md) for conventions and the branch/PR workflow, and
[app/public/vendor/VENDOR.md](app/public/vendor/VENDOR.md) for library versions.

## Not yet included

Kubernetes manifests (the app is stateless apart from the media folder, which would then need shared storage), turn-by-turn
routing (route lines are straight between stops), login rate limiting, and an approval workflow for content.
