# Geschiedenis Achterhoek – notes for Claude

## Git workflow (mandatory)
- The initial implementation was committed to `main` once. From then on **never commit or push to `main`**.
- Every fix or feature gets its own branch (`feature/<name>` or `fix/<name>`) and its own pull request.
- A human reviews, approves and merges. Never merge a PR yourself and never enable auto-merge.

## Stack constraints
- Front-end: W3.CSS + W3.JS only, vendored in `app/public/vendor` (no CDN). OpenLayers (vendored) for the
  OpenStreetMap map. Plain ES modules, no build step. UI language: Dutch.
- Colours only through `w3-theme*` classes; the active theme is served at `/theme.css` and chosen by a Maintainer.
- Back-end: Node.js + Express 5, PostgreSQL. Containers: Podman (`Containerfile`, `compose.yaml`). Kubernetes is out of scope for now.
- Minimal implementations first.

## Architecture (keep it this way)
- `src/db/repositories/` – the only place with SQL. `Repository` is a generic table repository (find/insert/update/
  upsert/delete taking plain objects). Subclass (`PinRepository`, `RouteRepository`, `UserRepository`) only for
  queries the base cannot express. `Repositories` bundles them and provides `transaction(fn)` (unit of work).
- `src/services/` – business rules and validation as classes; they receive repositories via the constructor.
- `src/http/` – thin Express routers built from services; no SQL, no business rules.
- `src/container.js` – composition root; `createApp(container)` wires HTTP to services.
- Front-end: `public/js/core` (ApiClient, Session, Layout, dom helpers), `public/js/components` (reusable UI classes),
  `public/js/pages` (one class per page). Shared HTML fragments in `public/components` via `w3-include-html`.
- New schema changes: add a numbered file in `src/db/migrations/` and update `repositories/schemas.js`.

## Roles
Admin > Maintainer > Mapper > User (each inherits the ones below). Mappers manage their own pins/routes; admins everything;
maintainers also manage categories, periods and the theme.

## Commands (in `app/`)
- `npm start` – migrate, seed admin (`admin`/`admin` on an empty database) and serve on :3000
- `npm test` – needs `TEST_DATABASE_URL` pointing at a disposable database (it is wiped)
