import { PasswordHasher } from '../services/PasswordHasher.js';

const CATEGORIES = ['Oorlog en verzet', 'Kastelen en adel', 'Kerk en geloof', 'Boerenleven', 'Vestingsteden'];

const PERIODS = [
  { name: 'Middeleeuwen', year_start: 500, year_end: 1500 },
  { name: 'Tachtigjarige Oorlog', year_start: 1568, year_end: 1648 },
  { name: 'Gouden Eeuw', year_start: 1588, year_end: 1672 },
  { name: 'Tweede Wereldoorlog', year_start: 1940, year_end: 1945 },
];

const DEMO_NOTE = '\n\nVoorbeeldverhaal – vervang dit door eigen inhoud.';

const PINS = [
  {
    title: 'Beleg van Grol (1627)',
    summary: 'Frederik Hendrik verovert de vestingstad Grol op de Spanjaarden.',
    body: 'In 1627 sloeg stadhouder Frederik Hendrik het beleg om Grol, het huidige Groenlo. Na ongeveer een maand gaf de Spaanse bezetting zich over.',
    lat: 52.0417, lon: 6.6125, place_name: 'Groenlo', year_start: 1627, year_end: 1627,
    categories: ['Oorlog en verzet', 'Vestingsteden'], periods: ['Tachtigjarige Oorlog', 'Gouden Eeuw'],
  },
  {
    title: 'Kasteel Huis Bergh',
    summary: 'Een van de grootste kastelen van Nederland, in ’s-Heerenberg.',
    body: 'Huis Bergh was eeuwenlang de zetel van de heren en graven van Bergh.',
    lat: 51.8767, lon: 6.2475, place_name: "'s-Heerenberg", year_start: 1200, year_end: 1500,
    categories: ['Kastelen en adel'], periods: ['Middeleeuwen'],
  },
  {
    title: 'Ontploffing kasteel Bredevoort (1646)',
    summary: 'Een blikseminslag in de kruitvoorraad verwoest het kasteel.',
    body: 'In 1646 sloeg de bliksem in de kruitvoorraad van het kasteel van Bredevoort. Het kasteel werd verwoest en is nooit herbouwd.',
    lat: 51.9419, lon: 6.6206, place_name: 'Bredevoort', year_start: 1646, year_end: 1646,
    categories: ['Kastelen en adel', 'Vestingsteden'], periods: ['Tachtigjarige Oorlog', 'Gouden Eeuw'],
  },
  {
    title: 'Tante Riek en de LO',
    summary: 'In Winterswijk ontstaat de Landelijke Organisatie voor Hulp aan Onderduikers.',
    body: 'Helena Kuipers-Rietberg, bekend als Tante Riek, richtte samen met Frits Slomp de LO op, die onderduikers aan een adres hielp.',
    lat: 51.9725, lon: 6.7194, place_name: 'Winterswijk', year_start: 1942, year_end: 1945,
    categories: ['Oorlog en verzet'], periods: ['Tweede Wereldoorlog'],
  },
];

const DEMO_ROUTE = {
  title: 'Vestingsteden-route (voorbeeld)',
  description: 'Fietsroute langs Bredevoort, Groenlo en Winterswijk.',
  stops: ['Ontploffing kasteel Bredevoort (1646)', 'Beleg van Grol (1627)', 'Tante Riek en de LO'],
};

export class Seeder {
  /** @param {import('./repositories/Repositories.js').Repositories} repos */
  constructor(repos, { hasher = new PasswordHasher(), log = console.log } = {}) {
    this.repos = repos;
    this.hasher = hasher;
    this.log = log;
  }

  /** Ensures an admin account exists: admin / admin. Change that password before going live. */
  async seedAdmin() {
    if (await this.repos.users.exists({ role: 'admin' })) return;
    await this.repos.users.insert({
      username: 'admin',
      display_name: 'Beheerder',
      password_hash: await this.hasher.hash('admin'),
      role: 'admin',
    }, { ignoreConflicts: true });
    this.log('admin-account aangemaakt (gebruikersnaam admin, wachtwoord admin) – wijzig dit wachtwoord!');
  }

  /** Demo content so a fresh install shows something; only runs on an empty pins table. */
  async seedDemo() {
    if (await this.repos.pins.exists({})) return;
    await this.repos.transaction(async (r) => {
      const admin = await r.users.findOne({ role: 'admin' });
      const categories = await r.categories.insertMany(CATEGORIES.map((name) => ({ name })), { ignoreConflicts: true });
      const periods = await r.periods.insertMany(PERIODS, { ignoreConflicts: true });
      const catId = Object.fromEntries(categories.map((c) => [c.name, c.id]));
      const periodId = Object.fromEntries(periods.map((p) => [p.name, p.id]));
      const pinId = {};
      for (const { categories: cats, periods: pers, ...pin } of PINS) {
        const created = await r.pins.insert({ ...pin, body: pin.body + DEMO_NOTE, owner_id: admin.id });
        pinId[pin.title] = created.id;
        await r.pinCategories.insertMany(cats.filter((c) => catId[c]).map((c) => ({ pin_id: created.id, category_id: catId[c] })));
        await r.pinPeriods.insertMany(pers.filter((p) => periodId[p]).map((p) => ({ pin_id: created.id, period_id: periodId[p] })));
      }
      const route = await r.routes.insert({ title: DEMO_ROUTE.title, description: DEMO_ROUTE.description, owner_id: admin.id });
      await r.routePins.insertMany(DEMO_ROUTE.stops.map((title, position) => ({ route_id: route.id, pin_id: pinId[title], position })));
    });
    this.log('voorbeeldinhoud aangemaakt');
  }
}
