import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { BADGES } from '../constants.js';
import { fmt, initials } from '../utils.js';

const pointsNote = (reason) =>
  reason === 'quick_bonus' ? 'Bonus for return within 3 days' : 'Item returned with a proof photo';

export default function Profile() {
  const [p, setP] = useState();

  useEffect(() => {
    api('/profile').then(setP);
  }, []);

  if (!p) return null;

  const amount = p.n; // items that have been returned
  const nextBadge = BADGES.find((b) => b[1] > amount);
  const currentBadge = [...BADGES].reverse().find((b) => amount >= b[1]);

  const stats = [
    [amount, 'Items returned'],
    [p.points, 'Total points'],
    [p.rank ? '#' + p.rank : '-', 'Rank this month'],
  ];

  return (
    <div className="w960">
      {/* Profile card */}
      <div className="panel">
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="av" style={{ width: 72, height: 72, fontSize: 26 }}>{initials(p.name)}</div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: 26 }}>{p.name}</h1>
            <div className="sm">
              {currentBadge ? currentBadge[0] + ', ' : ''}joined {fmt(p.joined)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            {stats.map((s) => (
              <div key={s[1]}>
                <div style={{ fontSize: 26, fontWeight: 700 }}>{s[0]}</div>
                <div className="sm">{s[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress toward the next badge */}
      {nextBadge && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="sbar">
            <b>Toward {nextBadge[0]}</b>
            <span>{amount} of {nextBadge[1]} items</span>
          </div>
          <div className="bar" style={{ margin: '10px 0' }}>
            <i style={{ width: Math.min(100, (amount / nextBadge[1]) * 100) + '%' }} />
          </div>
          <div className="sm">
            {nextBadge[1] - amount} more items to earn the next badge.
          </div>
        </div>
      )}

      <div className="two" style={{ marginTop: 16 }}>
        {/* Badges */}
        <div className="panel">
          <h3 style={{ fontSize: 20, marginBottom: 14 }}>Badges</h3>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {BADGES.map((b) => (
              <div key={b[0]} style={{ textAlign: 'center', width: 90 }}>
                <div className={'bdg ' + (amount >= b[1] ? 'on' : '')} style={{ margin: '0 auto 6px' }}>
                  {b[1]}
                </div>
                <div className="sm" style={{ color: amount >= b[1] ? 'var(--acc2)' : '#7A8885' }}>
                  {b[0]}
                </div>
              </div>
            ))}
          </div>

          <label className="sm" style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <input type="checkbox" defaultChecked />{' '}
            Show my badges and ranking on my public profile
          </label>
        </div>

        {/* Points history */}
        <div className="panel">
          <h3 style={{ fontSize: 20, marginBottom: 6 }}>Points history</h3>

          {p.history.map((h, i) => (
            <div className="lrow" key={i}>
              <div className="gr">
                <b>{h.title}</b>
                <div className="sm">{fmt(h.created_at)} · {pointsNote(h.reason)}</div>
              </div>
              <b style={{ color: 'var(--acc)' }}>+{h.amount}</b>
            </div>
          ))}
          {!p.history.length && <div className="sm">No points yet.</div>}

          <div className="sm" style={{ marginTop: 10 }}>
            Points are given for handovers with a proof photo from the finder.
          </div>
        </div>
      </div>
    </div>
  );
}
