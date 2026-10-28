import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { samplePin, setupApp, skipWithoutDb } from './helpers.js';

// 1×1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

describe('API', { skip: skipWithoutDb }, () => {
  let ctx;
  let admin; let maintainer; let mapper; let otherMapper; let user;

  before(async () => {
    ctx = await setupApp();
    admin = await ctx.agentFor('admin', 'admin');
    maintainer = await ctx.agentFor('maintainer');
    mapper = await ctx.agentFor('mapper');
    otherMapper = await ctx.agentFor('mapper');
    user = await ctx.agentFor('user');
  });
  after(() => ctx?.teardown());

  test('health check and theme stylesheet', async () => {
    await ctx.anonymous().get('/healthz').expect(200, { ok: true });
    const css = await ctx.anonymous().get('/theme.css').expect(200);
    assert.match(css.text, /\.w3-theme \{color:#fff !important; background-color:#4caf50/);
  });

  test('registration, login and me', async () => {
    const reg = await ctx.anonymous().post('/api/auth/register').send({ username: 'nieuw', password: 'kort' });
    assert.equal(reg.status, 400);
    const ok = await ctx.anonymous().post('/api/auth/register').send({ username: 'nieuw', password: 'lang-genoeg', email: 'n@example.test' });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.user.role, 'user');
    assert.equal(ok.body.user.password_hash, undefined);
    const dup = await ctx.anonymous().post('/api/auth/register').send({ username: 'NIEUW2', email: 'n@example.test', password: 'lang-genoeg' });
    assert.equal(dup.status, 409);
    await ctx.anonymous().post('/api/auth/login').send({ username: 'nieuw', password: 'fout' }).expect(401);
    const me = await user.get('/api/auth/me').expect(200);
    assert.equal(me.body.user.role, 'user');
  });

  test('role inheritance on endpoints', async () => {
    await ctx.anonymous().post('/api/pins').send(samplePin()).expect(401);
    await user.post('/api/pins').send(samplePin()).expect(403);
    await mapper.post('/api/categories').send({ name: 'X' }).expect(403);
    await maintainer.post('/api/pins').send(samplePin()).expect(201); // maintainer inherits mapper
    await maintainer.post('/api/categories').send({ name: 'Kerk' }).expect(201);
    await maintainer.get('/api/users').expect(403);
    await admin.get('/api/users').expect(200);
  });

  test('pins: ownership, visibility and filters', async () => {
    const { body: { item: period } } = await maintainer.post('/api/periods').send({ name: 'WO2', year_start: 1940, year_end: 1945 });
    const { body: { item: cat } } = await maintainer.post('/api/categories').send({ name: 'Verzet' });
    const { body: { pin } } = await mapper.post('/api/pins')
      .send(samplePin({ title: 'Onderduikers', lat: 51.9725, lon: 6.7194, year_start: 1943, year_end: 1944, categoryIds: [cat.id] }))
      .expect(201);
    const { body: { pin: draft } } = await mapper.post('/api/pins').send(samplePin({ title: 'Concept', published: false })).expect(201);

    await otherMapper.put(`/api/pins/${pin.id}`).send(samplePin()).expect(403);
    await admin.put(`/api/pins/${pin.id}`).send(samplePin({ title: 'Onderduikers', lat: 51.9725, lon: 6.7194, year_start: 1943, year_end: 1944, categoryIds: [cat.id] })).expect(200);

    await ctx.anonymous().get(`/api/pins/${draft.id}`).expect(404);
    await mapper.get(`/api/pins/${draft.id}`).expect(200);
    const titles = async (agent, qs) => (await agent.get('/api/pins').query(qs)).body.pins.map((p) => p.title);
    assert.ok(!(await titles(ctx.anonymous(), {})).includes('Concept'));
    assert.ok((await titles(mapper, { mine: '1' })).includes('Concept'));
    await user.get('/api/pins').query({ mine: '1' }).expect(403);

    assert.deepEqual(await titles(ctx.anonymous(), { period: period.id }), ['Onderduikers'], 'period by year overlap');
    assert.deepEqual(await titles(ctx.anonymous(), { category: cat.id }), ['Onderduikers']);
    assert.deepEqual(await titles(ctx.anonymous(), { near: '51.97,6.72', radius: '2' }), ['Onderduikers']);
    assert.deepEqual(await titles(ctx.anonymous(), { yearFrom: 1940, yearTo: 1950 }), ['Onderduikers']);
    assert.deepEqual(await titles(ctx.anonymous(), { q: 'onderduik' }), ['Onderduikers']);
    assert.ok((await titles(ctx.anonymous(), { place: 'groenlo' })).length >= 1);

    const detail = (await ctx.anonymous().get(`/api/pins/${pin.id}`).expect(200)).body.pin;
    assert.deepEqual(detail.categories.map((c) => c.name), ['Verzet']);
    assert.equal(detail.can_edit, false);
  });

  test('favorites', async () => {
    const { body: { pins } } = await ctx.anonymous().get('/api/pins');
    const pinId = pins[0].id;
    await ctx.anonymous().put(`/api/favorites/${pinId}`).expect(401);
    await user.put(`/api/favorites/${pinId}`).expect(204);
    await user.put(`/api/favorites/${pinId}`).expect(204); // idempotent
    assert.deepEqual((await user.get('/api/favorites')).body.pinIds, [pinId]);
    const favs = (await user.get('/api/pins').query({ favorites: '1' })).body.pins;
    assert.deepEqual(favs.map((p) => p.id), [pinId]);
    assert.equal(favs[0].is_favorite, true);
    assert.equal((await ctx.anonymous().get('/api/pins').query({ favorites: '1' })).body.pins.length, 0);
    await user.delete(`/api/favorites/${pinId}`).expect(204);
  });

  test('routes: stops, filters by pin, exports', async () => {
    const make = (title, lat) => mapper.post('/api/pins').send(samplePin({ title, lat })).then((r) => r.body.pin);
    const [a, b, c] = [await make('A', 52.0), await make('B', 52.1), await make('C', 52.2)];
    const { body: { pin: foreignDraft } } = await otherMapper.post('/api/pins').send(samplePin({ title: 'Geheim', published: false }));
    await mapper.post('/api/routes').send({ title: 'Mag niet', pinIds: [foreignDraft.id] }).expect(400);

    const { body: { route } } = await mapper.post('/api/routes').send({ title: 'Rondje', pinIds: [c.id, a.id, b.id] }).expect(201);
    const detail = (await ctx.anonymous().get(`/api/routes/${route.id}`).expect(200)).body.route;
    assert.deepEqual(detail.stops.map((s) => s.title), ['C', 'A', 'B']);

    const byPin = (await ctx.anonymous().get('/api/routes').query({ pin: a.id })).body.routes;
    assert.deepEqual(byPin.map((r) => r.title), ['Rondje']);
    assert.equal(byPin[0].pin_count, 3);
    assert.equal((await ctx.anonymous().get('/api/routes').query({ q: 'bestaatniet' })).body.routes.length, 0);
    const pinsInRoute = (await ctx.anonymous().get('/api/pins').query({ route: route.id })).body.pins.map((p) => p.title).sort();
    assert.deepEqual(pinsInRoute, ['A', 'B', 'C']);

    const gpx = await ctx.anonymous().get(`/api/routes/${route.id}/export.gpx`).expect(200);
    assert.match(gpx.headers['content-type'], /application\/gpx\+xml/);
    assert.match(gpx.headers['content-disposition'], /Rondje\.gpx/);
    assert.equal((gpx.text.match(/<rtept /g) || []).length, 3);

    const links = (await ctx.anonymous().get(`/api/routes/${route.id}/links`).query({ mode: 'walking' }).expect(200)).body;
    assert.match(links.google[0], /^https:\/\/www\.google\.com\/maps\/dir\//);
    assert.match(links.apple[0], /^https:\/\/maps\.apple\.com\/\?saddr=/);
    await ctx.anonymous().get(`/api/routes/${route.id}/links`).query({ mode: 'raket' }).expect(400);

    await otherMapper.delete(`/api/routes/${route.id}`).expect(403);
    await mapper.put(`/api/routes/${route.id}`).send({ title: 'Rondje', pinIds: [a.id], published: false }).expect(200);
    await ctx.anonymous().get(`/api/routes/${route.id}`).expect(404);
    await mapper.delete(`/api/routes/${route.id}`).expect(204);
  });

  test('media upload, type check and cleanup', async () => {
    const { body: { pin } } = await mapper.post('/api/pins').send(samplePin({ title: 'Met foto' }));
    await otherMapper.post(`/api/pins/${pin.id}/media`).attach('files', PNG, { filename: 'a.png', contentType: 'image/png' }).expect(403);
    await mapper.post(`/api/pins/${pin.id}/media`)
      .attach('files', Buffer.from('<script>alert(1)</script>'), { filename: 'x.html', contentType: 'text/html' }).expect(400);
    const up = await mapper.post(`/api/pins/${pin.id}/media`).field('caption', 'Kerk')
      .attach('files', PNG, { filename: 'kerk.png', contentType: 'image/png' }).expect(201);
    const [item] = up.body.media;
    assert.equal(item.kind, 'image');
    assert.match(item.file_name, new RegExp(`^${pin.id}/[0-9a-f-]+\\.png$`));

    const file = await ctx.anonymous().get(`/media/${item.file_name}`).expect(200);
    assert.equal(file.headers['content-type'], 'image/png');
    assert.equal((await ctx.anonymous().get('/api/pins').query({ q: 'Met foto' })).body.pins[0].thumbnail, item.file_name);

    await mapper.put(`/api/media/${item.id}`).send({ caption: 'Nieuw' }).expect(200);
    await mapper.delete(`/api/pins/${pin.id}`).expect(204);
    await ctx.anonymous().get(`/media/${item.file_name}`).expect(404);
  });

  test('theme and user administration', async () => {
    await mapper.put('/api/settings/theme').send({ name: 'blue' }).expect(403);
    await maintainer.put('/api/settings/theme').send({ name: 'bestaatniet' }).expect(400);
    await maintainer.put('/api/settings/theme').send({ name: 'blue' }).expect(200);
    assert.equal((await ctx.anonymous().get('/api/settings/theme')).body.name, 'blue');
    assert.match((await ctx.anonymous().get('/theme.css')).text, /#2196f3/);

    const { body: { users } } = await admin.get('/api/users');
    const adminUser = users.find((u) => u.username === 'admin');
    await admin.put(`/api/users/${adminUser.id}/role`).send({ role: 'user' }).expect(400); // last admin
    const target = users.find((u) => u.username === 'nieuw');
    const res = await admin.put(`/api/users/${target.id}/role`).send({ role: 'mapper' }).expect(200);
    assert.equal(res.body.user.role, 'mapper');
  });

  test('password change', async () => {
    await admin.put('/api/auth/password').send({ currentPassword: 'fout', newPassword: 'nieuwwachtwoord' }).expect(400);
    await admin.put('/api/auth/password').send({ currentPassword: 'admin', newPassword: 'nieuwwachtwoord' }).expect(204);
    await ctx.anonymous().post('/api/auth/login').send({ username: 'admin', password: 'nieuwwachtwoord' }).expect(200);
  });
});
