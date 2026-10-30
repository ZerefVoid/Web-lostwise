import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { STAT, HOW } from '../constants.js';
import Card from '../components/Card.jsx';

const FILTER = ['All active', 'Lost', 'Found', 'Claim in progress', 'Returned'];

export default function Home({ go, categories, create, full }) {
  const [q, setQ] = useState('');
  const [k, setK] = useState('');
  const [search, setSearch] = useState({ q: '', k: '' }); // only changes when "Search" is clicked
  const [filter, setFilter] = useState('All active');
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.k) params.set('category', search.k);
    if (search.q) params.set('q', search.q);
    api('/reports?' + params).then(setReports);
  }, [search]);

  const show = reports.filter((r) =>
    filter === 'All active' ? r.status !== 'returned' : STAT[r.status] === filter
  );

  return (
    <>
      <div className="hero">
        <div className="in">
          <h1>Lost something? Find it here.</h1>
          <p>
            One place to report, search and match lost items on campus, with safe owner verification.
          </p>

          <div className="search">
            <input
              className="inp"
              placeholder="Search: wallet, keys, phone..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select className="inp" value={k} onChange={(e) => setK(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id}>{c.name}</option>)}
            </select>
            <button className="btn pri lg" onClick={() => setSearch({ q, k })}>Search</button>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', width: '100%' }}>
            <button className={'btn lg ' + (full ? 'off' : 'drk')} onClick={() => create('lost')}>
              I lost something
            </button>
            <button className={'btn lg ' + (full ? 'off' : 'outd')} onClick={() => create('found')}>
              I found something
            </button>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="sec">
          <h2>How Lostwise works</h2>
          <div className="grid4 how">
            {HOW.map((h) => (
              <div className="panel" key={h[0]}>
                <div className="l">{h[0]}</div>
                <h3>{h[1]}</h3>
                <p>{h[2]}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="sec" style={{ paddingBottom: 56 }}>
          <h2>Latest reports</h2>
          <div className="chips">
            {FILTER.map((f) => (
              <span key={f} className={'chip ' + (filter === f ? 'on' : '')} onClick={() => setFilter(f)}>
                {f}
              </span>
            ))}
          </div>

          {show.length ? (
            <div className="cards">
              {show.map((r) => <Card key={r.id} r={r} go={go} />)}
            </div>
          ) : (
            <div className="panel sm">No reports match your search yet.</div>
          )}
        </div>
      </div>
    </>
  );
}
