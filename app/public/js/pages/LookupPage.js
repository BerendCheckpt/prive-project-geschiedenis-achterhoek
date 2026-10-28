import { Layout } from '../core/Layout.js';
import { $ } from '../core/dom.js';
import { CrudTable } from '../components/CrudTable.js';

const KINDS = {
  categories: { endpoint: '/categories', listKey: 'categories', noun: 'Categorie', fields: [{ key: 'name', label: 'Naam' }] },
  periods: {
    endpoint: '/periods',
    listKey: 'periods',
    noun: 'Periode',
    fields: [
      { key: 'name', label: 'Naam' },
      { key: 'year_start', label: 'Van (jaar)', type: 'number' },
      { key: 'year_end', label: 'Tot (jaar)', type: 'number' },
    ],
  },
};

await Layout.init({ requireRole: 'maintainer' });
await new CrudTable($('#table'), KINDS[$('script[data-kind]').dataset.kind]).load();
