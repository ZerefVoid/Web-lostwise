import { useState, useEffect } from 'react';
import { api } from '../api.js';
import Card from '../components/Card.jsx';

// List page for "Lost items" (j = 'lost') and "Found items" (j = 'found')
export default function ItemList({ j, go, categories, create, full }) {
  const lost = j === 'lost';
  const [q, setQ] = useState('');
  const [k, setK] = useState('');
  const [search, setSearch] = useState({ q: '', k: '' }); // only changes when "Search" is clicked
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams({ type: j, status: lost ? 'lost' : 'found' });
    if (search.k) params.set('category', search.k);
    if (search.q) params.set('q', search.q);
    api('/reports?' + params).then(setReports);
  }, [j, search, lost]);

  return (
    <div className="wrap">
      <div className="sec" style={{ paddingBottom: 56 }}>
        <h1 className="pt">{lost ? 'Lost items' : 'Found items'}</h1>
        <p className="subt">
          {lost
            ? 'Reports of items their owners are looking for. If you found it, create a found report.'
            : 'Items that have been found and are waiting for their owners. If this is yours, start a claim and verify through chat.'}
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0 20px' }}>
          <input
            className="inp"
            style={{ flex: 2, minWidth: 180 }}
            placeholder="Search: wallet, keys, phone..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="inp"
            style={{ flex: 1, minWidth: 160 }}
            value={k}
            onChange={(e) => setK(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id}>{c.name}</option>)}
          </select>
          <button className="btn pri" onClick={() => setSearch({ q, k })}>Search</button>
          <button className={'btn ' + (full ? 'off' : 'drk')} onClick={() => create(j)}>
            {lost ? 'I lost something' : 'I found something'}
          </button>
        </div>

        {reports.length ? (
          <div className="cards">
            {reports.map((r) => <Card key={r.id} r={r} go={go} />)}
          </div>
        ) : (
          <div className="panel sm">
            No {lost ? 'lost items' : 'found items'} match your search yet.
          </div>
        )}
      </div>
    </div>
  );
}
