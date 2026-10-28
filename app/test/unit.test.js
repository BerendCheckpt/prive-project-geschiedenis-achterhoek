import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Repository } from '../src/db/repositories/Repository.js';
import { PinCriteria } from '../src/db/repositories/PinCriteria.js';
import { SqlParams } from '../src/db/SqlParams.js';
import { PinFilter } from '../src/services/PinFilter.js';
import { RouteExporter } from '../src/services/RouteExporter.js';

/** Records queries instead of running them. */
class FakeDb {
  constructor(rows = []) { this.calls = []; this.rows = rows; }
  async query(text, params) { this.calls.push({ text: text.replace(/\s+/g, ' ').trim(), params }); return { rows: this.rows, rowCount: this.rows.length }; }
}

const schema = { table: 'things', columns: ['id', 'name', 'owner_id', 'tags'] };

test('Repository builds parameterised queries from plain objects', async () => {
  const db = new FakeDb([{ id: 1 }]);
  const repo = new Repository(db, schema);
  await repo.findAll({ owner_id: 3, id: [1, 2], name: null }, { orderBy: ['-name', 'id'], limit: 5 });
  assert.deepEqual(db.calls[0], {
    text: 'SELECT * FROM "things" WHERE "owner_id" = $1 AND "id" = ANY($2) AND "name" IS NULL ORDER BY "name" DESC, "id" LIMIT $3',
    params: [3, [1, 2], 5],
  });
  await repo.insertMany([{ name: 'a', owner_id: 1 }, { name: 'b', owner_id: 2 }], { ignoreConflicts: true });
  assert.equal(db.calls[1].text, 'INSERT INTO "things" ("name", "owner_id") VALUES ($1, $2), ($3, $4) ON CONFLICT DO NOTHING RETURNING *');
  await repo.updateById(7, { name: 'x', owner_id: undefined });
  assert.deepEqual(db.calls[2], { text: 'UPDATE "things" SET "name" = $1 WHERE "id" = $2 RETURNING *', params: ['x', 7] });
  await repo.upsert({ id: 1, name: 'y' });
  assert.match(db.calls[3].text, /ON CONFLICT \("id"\) DO UPDATE SET "name" = EXCLUDED\."name"/);
});

test('Repository rejects unknown columns and empty deletes', async () => {
  const repo = new Repository(new FakeDb(), schema);
  await assert.rejects(repo.findAll({ 'name; DROP TABLE x': 1 }), /Onbekende kolom/);
  await assert.rejects(repo.insert({ evil: 1 }), /Onbekende kolom/);
  await assert.rejects(repo.delete({}), /Lege where-clausule/);
});

test('Repository.withDb keeps schema and subclass', () => {
  class Special extends Repository { hello() { return 'hi'; } }
  const other = new FakeDb();
  const bound = new Special(new FakeDb(), schema).withDb(other);
  assert.equal(bound.db, other);
  assert.equal(bound.table, 'things');
  assert.equal(bound.hello(), 'hi');
});

test('PinFilter parses query strings and validates input', () => {
  const f = PinFilter.fromQuery({ q: ' kasteel ', period: '1,2,x', near: '52,6.5', radius: '10', favorites: '1' });
  assert.equal(f.q, 'kasteel');
  assert.deepEqual(f.periods, [1, 2]);
  assert.deepEqual(f.near, { lat: 52, lon: 6.5, radius: 10 });
  assert.equal(f.favorites, true);
  assert.equal(new PinFilter().isEmpty, true);
  assert.throws(() => PinFilter.fromQuery({ near: '95,1' }), /Breedtegraad/);
  assert.throws(() => PinFilter.fromQuery({ bbox: '1,2,3' }), /bbox/);
});

test('PinCriteria only emits placeholders for values', () => {
  const params = new SqlParams();
  const where = new PinCriteria(PinFilter.fromQuery({ q: "x' OR 1=1", category: '3' }), { userId: 9 }).conditions(params, 'p');
  assert.equal(where[0], 'p.published');
  assert.ok(!where.join(' ').includes("OR 1=1"));
  assert.deepEqual(params.values, ["%x' OR 1=1%", [3]]);
  const anon = new PinCriteria(PinFilter.fromQuery({ favorites: '1' })).conditions(new SqlParams(), 'p');
  assert.ok(anon.includes('false'), 'favorites without a user matches nothing');
});

const stops = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, title: `Stop <${i + 1}>`, lat: 52 + i / 100, lon: 6.5 }));

test('RouteExporter splits long routes into connected legs', () => {
  const exporter = new RouteExporter({ maxStopsPerLink: 10 });
  const legs = exporter.legs(stops);
  assert.equal(legs.length, 2);
  assert.equal(legs[0].length, 10);
  assert.equal(legs[1][0], legs[0][9], 'second leg starts at the end of the first');
  assert.equal(legs[1].at(-1), stops.at(-1));
});

test('RouteExporter builds Google and Apple Maps links', () => {
  const exporter = new RouteExporter();
  const [google] = exporter.googleMapsUrls(stops.slice(0, 3), 'bicycling');
  const url = new URL(google);
  assert.equal(url.searchParams.get('origin'), '52.000000,6.500000');
  assert.equal(url.searchParams.get('destination'), '52.020000,6.500000');
  assert.equal(url.searchParams.get('waypoints'), '52.010000,6.500000');
  assert.equal(url.searchParams.get('travelmode'), 'bicycling');
  const [apple] = exporter.appleMapsUrls(stops.slice(0, 3), 'walking');
  assert.equal(apple, 'https://maps.apple.com/?saddr=52.000000,6.500000&daddr=52.010000,6.500000+to:52.020000,6.500000&dirflg=w');
});

test('RouteExporter writes escaped GPX', () => {
  const gpx = new RouteExporter().gpx({ title: 'A & B', description: null }, stops.slice(0, 2), 'https://example.test');
  assert.match(gpx, /<gpx version="1.1"/);
  assert.match(gpx, /<name>A &amp; B<\/name>/);
  assert.match(gpx, /<name>Stop &lt;1&gt;<\/name>/);
  assert.equal((gpx.match(/<wpt /g) || []).length, 2);
  assert.equal((gpx.match(/<rtept /g) || []).length, 2);
  assert.match(gpx, /href="https:\/\/example.test\/pin.html\?id=1"/);
});
