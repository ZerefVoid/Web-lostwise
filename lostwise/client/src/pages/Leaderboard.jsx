import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function Leaderboard() {
  const [period, setPeriod] = useState('month'); // 'month' or 'all'
  const [list, setList] = useState([]);

  useEffect(() => {
    api('/leaderboard?period=' + period).then(setList);
  }, [period]);

  return (
    <div className="pg">
      <h1 className="pt">Finder leaderboard</h1>
      <p className="subt">Thank you to everyone who helps items get back to their owners.</p>

      <div className="chips" style={{ marginTop: 16 }}>
        <span className={'chip ' + (period === 'month' ? 'on' : '')} onClick={() => setPeriod('month')}>
          This month
        </span>
        <span className={'chip ' + (period === 'all' ? 'on' : '')} onClick={() => setPeriod('all')}>
          All time
        </span>
      </div>

      <div className="two" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="panel" style={{ padding: '12px 24px' }}>
          {list.map((x, i) => (
            <div key={i} className={'lrow ' + (i < 3 ? 'top' : '')}>
              <b style={{ width: 32, fontSize: 18 }}>{i + 1}</b>
              <div className="av" style={{ width: 44, height: 44 }}>{x.initials}</div>
              <div className="gr">
                <b>{x.initials}</b>
                <div className="sm">{x.badge || ''}</div>
              </div>
              <b>{x.points} points</b>
            </div>
          ))}
          {!list.length && <div className="sm" style={{ padding: 16 }}>No data.</div>}
        </div>

        <div className="panel">
          <h3 style={{ fontSize: 20, marginBottom: 10 }}>How to earn points</h3>
          <p style={{ fontSize: 14 }}>10 points for each item returned with a proof photo.</p>
          <p className="sm" style={{ marginTop: 10 }}>The monthly leaderboard resets at the start of each month.</p>
        </div>
      </div>
    </div>
  );
}
