import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import config from '../src/config.js';
import { createContainer } from '../src/container.js';
import { createApp } from '../src/app.js';
import { Migrator } from '../src/db/migrate.js';
import { Seeder } from '../src/db/seed.js';
import { PasswordHasher } from '../src/services/PasswordHasher.js';

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
export const skipWithoutDb = TEST_DATABASE_URL ? false : 'TEST_DATABASE_URL is niet gezet';

/** Fresh schema + app for one test file. The test database is wiped. */
export async function setupApp() {
  const mediaDir = await mkdtemp(path.join(os.tmpdir(), 'ga-media-'));
  const container = createContainer({ ...config, databaseUrl: TEST_DATABASE_URL, mediaDir });
  await container.db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  await new Migrator(container.db, { log: () => {} }).run();
  const hasher = new PasswordHasher({ rounds: 4 });
  await new Seeder(container.repos, { hasher, log: () => {} }).seedAdmin();
  const app = createApp(container);

  /** Creates a user with the given role and returns a logged-in supertest agent. */
  async function agentFor(role, username = `${role}-${Math.random().toString(36).slice(2, 8)}`) {
    if (role !== 'admin' || username !== 'admin') {
      await container.repos.users.insert({ username, password_hash: await hasher.hash('wachtwoord1'), role });
    }
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/login').send({ username, password: username === 'admin' ? 'admin' : 'wachtwoord1' });
    if (res.status !== 200) throw new Error(`login ${username} failed: ${res.status}`);
    return agent;
  }

  async function teardown() {
    await container.db.end();
    await rm(mediaDir, { recursive: true, force: true });
  }

  return { app, container, agentFor, teardown, anonymous: () => request(app) };
}

export const samplePin = (overrides = {}) => ({
  title: 'Testverhaal', summary: 'Kort', body: 'Lang verhaal', lat: 52.0417, lon: 6.6125,
  place_name: 'Groenlo', year_start: 1627, year_end: 1627, ...overrides,
});
