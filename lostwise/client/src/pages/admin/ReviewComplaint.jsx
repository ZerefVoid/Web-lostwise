import { useState, useEffect } from 'react';
import { api } from '../../api.js';
import { STAT, ASTAT } from '../../constants.js';
import { fmt, isStale } from '../../utils.js';

// Page to review one complaint. id = complaint id
export default function ReviewComplaint({ id, user, go, toast, setDlg }) {
  const [a, setA] = useState();
  const [decision, setDecision] = useState('');
  const [note, setNote] = useState('');
  const [chat, setChat] = useState(null); // claim chat content once an admin opened it

  const load = () => api('/admin/complaints/' + id).then(setA);
  useEffect(() => { load(); }, [id]);

  if (!a) return null;

  // ---- Derived data ----
  const iAmHandler = a.handler_id === user.id;
  const done = a.status === 'done';
  const canDecide = iAmHandler && !done;
  const owner = a.owner;                        // the reported user
  const warningLimitReached = a.warnings.length >= 3;
  const report = a.t.report;
  const message = a.t.message;

  // Decision options: [code, title, explanation]
  const decisionOptions = [
    ['report_valid', 'Report is valid', 'No violation. The report goes live again.'],
    ['delete_report', 'Delete report', 'Soft delete, the creator’s slot is freed.'],
    ...(a.type === 'message'
      ? [['hide_message', 'Hide message', 'Content is kept, shown as Message hidden by admin.']]
      : []),
    ['warn_user', 'Warn user', 'The warning is recorded and the user is notified.'],
    ['close', 'Close report', 'No action.'],
  ];

  // ---- Actions ----
  const saveDecision = async () => {
    if (!decision) {
      return setDlg({ t: 'ok', title: 'Choose a decision', msg: 'Pick a decision before saving.' });
    }

    try {
      const result = await api(`/admin/complaints/${id}/decide`, { body: { decision, note } });
      toast('Report resolved.' + (result.note || ''));
      go('admin');
    } catch (x) {
      setDlg({ t: 'ok', title: 'Failed', msg: x.message });
    }
  };

  const openChat = async () => {
    setChat(await api(`/admin/claims/${message.claim_id}/messages?complaint=${a.id}`));
  };

  const takeOver = async () => {
    await api(`/admin/complaints/${a.id}/take-over`, { body: {} });
    load();
  };

  const toggleAccount = async () => {
    await api('/admin/accounts/' + owner.id, { body: {} });
    load();
  };

  return (
    <div className="w960">
      <div style={{ marginBottom: 12 }}>
        <a onClick={() => go('admin')}>← Admin dashboard</a>
      </div>

      <h1 className="pt">
        Review report{' '}
        <span className={'badge s-' + a.status} style={{ verticalAlign: 'middle' }}>{ASTAT[a.status]}</span>
      </h1>
      <p className="subt">Report #{a.id} · {String(a.created_at).slice(0, 10)}</p>

      <div className="two" style={{ marginTop: 20 }}>
        {/* ===== Left column ===== */}
        <div className="stk">

          {/* Complaint summary */}
          <div className="panel">
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Report summary</h3>
            <div className="rows">
              <div><b>Type</b><span>{a.type === 'report' ? 'Report' : 'Message'}</span></div>
              <div><b>Reason</b><span>{a.reason}</span></div>
              <div><b>Details</b><span>{a.details || '-'}</span></div>
              <div><b>Reporter</b><span>{a.reporter}</span></div>
              <div><b>Handled by</b><span>{a.handler || 'None yet'}</span></div>
            </div>

            {!iAmHandler && !done && (
              <div className="info" style={{ marginTop: 12 }}>
                Being handled {a.handler || 'another admin'}. Decision buttons are disabled.
                {isStale(a) && <> <a onClick={takeOver}>Take over</a></>}
              </div>
            )}
          </div>

          {/* Complaint target: report or message */}
          <div className="panel">
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Target</h3>

            {report && (
              <>
                <div className="cards" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="card">
                    <div
                      className={'ph ' + (report.photo_url ? '' : 'no')}
                      style={report.photo_url ? { backgroundImage: `url(${report.photo_url})` } : {}}
                    >
                      <span className={'b1 badge s-' + report.status}>
                        {STAT[report.status] || report.status}
                      </span>
                      <span className="b2">{report.category}</span>
                      {!report.photo_url && 'No photo'}
                    </div>
                    <div className="cb">
                      <h3>{report.title}</h3>
                      <div className="sm">{report.location_note}</div>
                      <div className="sm">{fmt(report.event_date)} · Lostwise user</div>
                    </div>
                  </div>
                </div>

                {report.type === 'found' && (
                  <div className="tipbox" style={{ marginTop: 12 }}>
                    <b>Secret feature (admin only):</b> {report.secret_feature}
                  </div>
                )}
              </>
            )}

            {message && (
              <>
                <div className={'bub ' + (message.hidden ? 'hid' : '')} style={{ maxWidth: '100%' }}>
                  <span className="who">{message.name}</span>
                  {message.hidden ? 'Message hidden by admin' : message.body}
                </div>

                <div className="lbtns">
                  <button className="btn out" disabled={!iAmHandler} onClick={openChat}>
                    Open claim chat
                  </button>
                </div>
                <div className="sm" style={{ marginTop: 8 }}>Chat access is recorded in the log.</div>

                {chat && (
                  <div
                    className="msgs"
                    style={{ marginTop: 10, border: '1px solid var(--line)', borderRadius: 10, padding: 10 }}
                  >
                    {chat.map((m) => (
                      <div
                        className="bub"
                        key={m.id}
                        style={m.id === message.id ? { outline: '2px solid var(--red)' } : {}}
                      >
                        <span className="who">{m.name}</span>
                        {m.hidden ? <i>Message hidden by admin</i> : m.body}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* History of the reported user */}
          <div className="panel">
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Reported user’s history</h3>

            {owner ? (
              <>
                <div className="sm">
                  {owner.name} · {a.warnings.length} from 3 warnings · {a.other} other reports
                </div>

                {a.warnings.map((w, i) => (
                  <div className="lrow" key={i}>
                    <div className="gr">
                      <b>{w.reason}</b>
                      <div className="sm">{String(w.created_at).slice(0, 10)}</div>
                    </div>
                  </div>
                ))}

                {warningLimitReached && (
                  <div className="warnb" style={{ marginTop: 12 }}>
                    This user has reached the warning limit. Consider deactivating the account.
                    <div className="lbtns">
                      <button className="btn warn" disabled={!owner.active} onClick={toggleAccount}>
                        {owner.active ? 'Deactivate account' : 'Account already inactive'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="sm">The target has been deleted.</div>
            )}
          </div>
        </div>

        {/* ===== Right column: decision ===== */}
        <div className="panel stk">
          <h3 style={{ fontSize: 20 }}>Decision</h3>

          {done ? (
            <div className="info">
              <b>Decision:</b> {a.decision}
              {a.note && <><br /><b>Note:</b> {a.note}</>}
            </div>
          ) : (
            <>
              {decisionOptions.map(([code, title, explanation]) => (
                <label className="opt" key={code} style={{ opacity: canDecide ? 1 : 0.55 }}>
                  <input
                    type="radio"
                    name="dec"
                    checked={decision === code}
                    disabled={!canDecide}
                    onChange={() => setDecision(code)}
                  />
                  <span>
                    <b>{title}</b><br />
                    <span className="sm">{explanation}</span>
                  </span>
                </label>
              ))}

              <div>
                <label className="sm" style={{ color: 'var(--fg)' }}>Admin note (optional)</label>
                <textarea
                  className="inp"
                  disabled={!canDecide}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <button
                className={'btn pri lg ' + (canDecide ? '' : 'off')}
                disabled={!canDecide}
                onClick={saveDecision}
              >
                Save decision
              </button>
            </>
          )}

          <button className="btn net lg" onClick={() => go('admin')}>Back</button>
        </div>
      </div>
    </div>
  );
}
