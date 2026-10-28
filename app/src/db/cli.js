// Usage: node src/db/cli.js migrate|seed
import config from '../config.js';
import { Database } from './Database.js';
import { Migrator } from './migrate.js';
import { Seeder } from './seed.js';
import { Repositories } from './repositories/Repositories.js';

const db = Database.connect(config.databaseUrl);
const cmd = process.argv[2];
try {
  if (cmd === 'migrate') {
    await new Migrator(db).run();
  } else if (cmd === 'seed') {
    const seeder = new Seeder(new Repositories(db));
    await seeder.seedAdmin();
    await seeder.seedDemo();
  } else {
    console.error('Gebruik: node src/db/cli.js migrate|seed');
    process.exitCode = 1;
  }
} finally {
  await db.end();
}
