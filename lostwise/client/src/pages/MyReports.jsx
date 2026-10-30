import { useState, useEffect, useContext } from 'react';
import { Ctx } from '../context.js';
import { api } from '../api.js';
import { STAT, ACTIVE } from '../constants.js';
import { fmt } from '../utils.js';

const LIMIT = 3;

// "My reports" page
export default function MyReports({ go, create }) {
  const D = useContext(Ctx);
  const [report, setReport] = useState([]);

  useEffect(() => {
    api('/reports/mine').then(setReport);
  }, []);

  const active = report.filter((r) => ACTIVE.includes(r.status));
  const history = report.filter((r) => !ACTIVE.includes(r.status));
  const activeCount = active.length;
  const full = activeCount >= LIMIT;

  const withdraw = (r) => D.setDlg({ t: 'withdraw', id: r.id, name: r.title });

  const cancelHandover = (r) =>
    D.setDlg({ t: 'cancel_handover', id: r.chosen_claim, rid: r.id, name: r.title });

  return (
    <div className="w960">
      <h1 className="pt">My reports</h1>
      <p className="subt">Track, edit and withdraw the reports you created.</p>

      {/* Report slot indicator */}
      <div
        className="panel"
        style={{ marginTop: 20, ...(full ? { background: 'var(--amber)', color: 'var(--amberfg)' } : {}) }}
      >
        <div className="sbar">
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{activeCount} of 3 active reports</div>
            <div className="slots">
              {[0, 1, 2].map((i) => <i key={i} className={i < activeCount ? 'f' : ''} />)}
            </div>
            <div className="sm" style={full ? { color: 'inherit' } : {}}>
              {full
                ? 'Slots full. Finish or withdraw a report to create a new one.'
                : `You can still create ${LIMIT - activeCount} more reports.`}
            </div>
          </div>
          <button className={'btn pri ' + (full ? 'off' : '')} onClick={() => create()}>Create report</button>
        </div>
      </div>

      {/* Active reports */}
      {active.length ? (
        active.map((r) => (
          <div className="panel" key={r.id} style={{ padding: 16, marginTop: 16 }}>
            <div className="sbar">
              <div>
                <span className={'badge s-' + r.status}>{STAT[r.status]}</span>
                <h3 style={{ fontSize: 16, marginTop: 8, cursor: 'pointer' }} onClick={() => go('detail', r.id)}>
                  {r.title}
                </h3>
                <div className="sm">
                  {r.type === 'lost' ? 'Lost report' : 'Found report'} · {fmt(r.created_at)}
                </div>
                {r.type === 'found' && (
                  <div className="sm" style={{ marginTop: 4 }}>
                    Secret feature (only you): <b>{r.secret_feature}</b>
                  </div>
                )}
              </div>
            </div>

            <div className="lbtns">
              {r.status === 'claim_in_progress' ? (
                <>
                  <button className="btn pri" onClick={() => go('handover', r.chosen_claim)}>Hand over item</button>
                  <button className="btn warn" onClick={() => cancelHandover(r)}>Cancel handover</button>
                  <button className="btn net" onClick={() => go('edit', r.id)}>Edit report</button>
                  <button className="btn off" disabled>Withdraw report</button>
                  <span className="sm">
                    Report is being claimed: features and the secret feature are locked, and the report cannot be withdrawn.
                  </span>
                </>
              ) : (
                <>
                  <button className="btn net" onClick={() => go('detail', r.id)}>View</button>
                  <button className="btn net" onClick={() => go('edit', r.id)}>Edit report</button>
                  <button className="btn warn" onClick={() => withdraw(r)}>Withdraw report</button>
                </>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="panel" style={{ marginTop: 16, textAlign: 'center' }}>
          <p>No active reports yet</p>
          <button className="btn pri" style={{ marginTop: 12 }} onClick={() => create()}>Create report</button>
        </div>
      )}

      {/* History (not counted toward the 3-report limit) */}
      <details style={{ marginTop: 28 }}>
        <summary>Report history ({history.length})</summary>
        <div className="sm" style={{ margin: '8px 0' }}>Not counted toward the 3-report limit.</div>

        {history.map((r) => (
          <div className="panel" key={r.id} style={{ padding: 16, marginTop: 10 }}>
            <span className={'badge s-' + r.status}>{STAT[r.status]}</span>{' '}
            <b style={{ marginLeft: 6 }}>{r.title}</b>{' '}
            <span className="sm">· {fmt(r.created_at)}</span>
          </div>
        ))}
        {!history.length && <div className="sm">No history yet.</div>}
      </details>
    </div>
  );
}
