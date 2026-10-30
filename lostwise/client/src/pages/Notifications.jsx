import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { fmt } from '../utils.js';

export default function Notifications({ go }) {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'

  useEffect(() => {
    api('/notifications').then(setList);
  }, []);

  const show = filter === 'unread' ? list.filter((n) => !n.is_read) : list;

  return (
    <div className="w860">
      <h1 className="pt">Notifications</h1>

      <div className="chips" style={{ margin: '16px 0' }}>
        <span className={'chip ' + (filter === 'all' ? 'on' : '')} onClick={() => setFilter('all')}>
          All
        </span>
        <span className={'chip ' + (filter === 'unread' ? 'on' : '')} onClick={() => setFilter('unread')}>
          Unread
        </span>
      </div>

      <div className="panel" style={{ padding: '8px 16px' }}>
        {show.map((n) => (
          <div key={n.id} className={'lrow ' + (n.is_read ? '' : 'top')}>
            {!n.is_read && <span className="ico" />}
            <div className="gr">
              <b>{n.body}</b>
              <div className="sm">{fmt(n.created_at)}</div>
            </div>
            {n.link && (
              <button
                className={'btn ' + (n.is_read ? 'out' : 'pri')}
                onClick={() => go('detail', +n.link)}
              >
                View
              </button>
            )}
          </div>
        ))}
        {!show.length && <div className="sm" style={{ padding: 16 }}>No notifications yet.</div>}
      </div>
    </div>
  );
}
