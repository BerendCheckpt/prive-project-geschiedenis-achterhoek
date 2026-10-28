import { mkdir } from 'node:fs/promises';
import { createContainer } from './src/container.js';
import { createApp } from './src/app.js';
import { Migrator } from './src/db/migrate.js';
import { Seeder } from './src/db/seed.js';

const container = createContainer();
const { config, db, repos } = container;

await mkdir(config.mediaDir, { recursive: true });
await new Migrator(db).run();
const seeder = new Seeder(repos);
await seeder.seedAdmin();
if (config.seedDemo) await seeder.seedDemo();

const server = createApp(container).listen(config.port, () => {
  console.log(`Geschiedenis Achterhoek draait op http://localhost:${config.port}`);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => db.end().then(() => process.exit(0))));
}
