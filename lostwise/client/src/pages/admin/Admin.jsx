import { useState, useEffect } from 'react';
import { api } from '../../api.js';
import { ASTAT } from '../../constants.js';
import { isStale } from '../../utils.js';

// Admin dashboard: stats, complaint list, account management, action log
export default function Admin({ user, go, toast }) {
  const [d, setD] = useState();

  const load = () => api('/admin/dashboard').then(setD);
  useEffect(() => { load(); }, []);

  if (!d) return null;

  const review = async (complaint) => {
    await api(`/admin/complaints/${complaint.id}/review`, { body: {} });
    go('review', complaint.id);
  };

  const takeOver = async (complaint) => {
    try {
      await api(`/admin/complaints/${complaint.id}/take-over`, { body: {} });
      toast('Report taken over.');
      go('review', complaint.id);
    } catch (x) {
      toast(x.message);
    }
  };

  const toggleAccount = async (u) => {
    const result = await api('/admin/accounts/' + u.id, { body: {} });
    toast(result.active ? 'Account activated.' : 'Account deactivated.');
    load();
  };

  const stats = [
    [d.userCount, 'User'],
    [d.activeCount, 'Active reports'],
    [d.returnedCount, 'Items returned'],
    [d.openCount, 'Open reports'],
  ];

  // Action button on each complaint row
  const complaintButton = (a) => {
    const handledByOtherAdmin = a.status === 'in_review' && a.handler_id !== user.id;

    if (a.status === 'done') {
      return <button className="btn net" onClick={() => go('review', a.id)}>View</button>;
    }
    if (handledByOtherAdmin) {
      return isStale(a)
        ? <button className="btn out" onClick={() => takeOver(a)}>Take over</button>
        : <button className="btn off" disabled>Handled {a.handler.split(' ')[0]}</button>;
    }
    return <button className="btn pri" onClick={() => review(a)}>Review</button>;
  };

  return (
    <div className="pg">
      <h1 className="pt">Admin dashboard</h1>

      {/* Stats */}
      <div className="sc" style={{ margin: '20px 0' }}>
        {stats.map((s) => (
          <div className="panel" key={s[1]}>
            <b>{s[0]}</b>
            <span>{s[1]}</span>
          </div>
        ))}
      </div>

      {/* Complaints */}
      <div className="panel">
        <h3 style={{ fontSize: 20 }}>Reports and disputes</h3>

        {d.complaints.map((a) => (
          <div className="lrow" key={a.id}>
            <div className="gr">
              <b>{a.type === 'report' ? 'Report' : 'Message'}: {a.reason}</b>
              <div className="sm">
                {a.type === 'report'
                  ? (a.title || '(deleted)')
                  : 'Message in claim #' + a.target_id.split(':')[0]}
                {' '}· reporter {a.reporter}
                {a.handler && a.status !== 'new' ? ' · handled by ' + a.handler : ''}
              </div>
            </div>
            <span className={'badge s-' + a.status}>{ASTAT[a.status]}</span>
            {complaintButton(a)}
          </div>
        ))}
        {!d.complaints.length && <div className="sm">No reports.</div>}
      </div>

      {/* Manage accounts */}
      <div className="panel" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 20, marginBottom: 8 }}>Manage accounts</h3>
        <div className="sx">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Warnings</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {d.users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.name}
                    {u.role === 'admin' && <> <span className="badge s-done">Admin</span></>}
                  </td>
                  <td>{u.email}</td>
                  <td>{u.warnings}</td>
                  <td>
                    <span className={'badge ' + (u.active ? 's-found' : 's-lost')}>
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {u.id === user.id ? '' : (
                      <button
                        className={'btn ' + (u.active ? 'net' : 'out')}
                        style={{ height: 36 }}
                        onClick={() => toggleAccount(u)}
                      >
                        {u.active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log */}
      <div className="panel" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 20, marginBottom: 8 }}>Admin action log</h3>
        {d.log.map((l, i) => (
          <div className="sm" key={i} style={{ padding: '4px 0' }}>
            {String(l.created_at).slice(0, 16)} · {l.admin} · {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}
