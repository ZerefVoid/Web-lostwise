import { useState, useEffect, useCallback, useContext } from 'react';
import { Ctx } from '../context.js';
import { api } from '../api.js';
import { STAT, ITEM_POSITIONS, ACTIVE } from '../constants.js';
import { fmt, initials } from '../utils.js';
import Photo from '../components/Photo.jsx';
import Chat from '../components/Chat.jsx';

const STEPS = ['Lost', 'Found', 'Claim in progress', 'Returned'];

export default function Detail({ id, user, go, reload }) {
  const D = useContext(Ctx);
  const [r, setR] = useState();
  const [error, setError] = useState('');
  const [newClaimId, setClaimNewId] = useState(); // id of the claim that was just started
  const [claimTab, setClaimTab] = useState();       // claim currently open (finder/admin)

  const load = useCallback(
    () => api('/reports/' + id).then(setR).catch((x) => setError(x.message)),
    [id]
  );
  useEffect(() => { load(); }, [load]);

  if (error) return <div className="pg"><div className="panel">{error}</div></div>;
  if (!r) return null;

  // ---- Derived data ----
  const mine = r.mine;
  const otherAdmin = r.admin && !mine; // admin viewing someone else's report
  const claimList = Array.isArray(r.claim) ? r.claim : [];
  const myClaim = !mine && r.claim && r.claim[0];
  const activeClaimId = newClaimId || (myClaim && myClaim.id);
  const openClaim = claimList.find((c) => c.id === claimTab) || claimList[0];

  // Position on the step indicator (0 to 3)
  let step;
  if (r.status === 'found' || r.status === 'lost') step = r.type === 'lost' ? 0 : 1;
  else if (r.status === 'claim_in_progress') step = 2;
  else step = 3;

  // ---- Actions ----
  const reportButton = (
    <button className="btn warn" onClick={() => D.setDlg({ t: 'rpt', id: r.id })}>Report</button>
  );

  const startClaim = async () => {
    try {
      const claim = await api(`/reports/${id}/claims`, { body: {} });
      setClaimNewId(claim.id);
      load();
    } catch (x) {
      D.setDlg({ t: 'ok', title: 'Cannot claim', msg: x.message });
    }
  };

  // Lost report: the finder opens a chat with the owner directly
  const startFind = async () => {
    try {
      const chat = await api(`/reports/${id}/finds`, { body: {} });
      setClaimNewId(chat.id);
      load();
    } catch (x) {
      D.setDlg({ t: 'ok', title: 'Cannot start chat', msg: x.message });
    }
  };

  // Simple right panel: title, text and button
  const actionPanel = (title, text, button) => (
    <div className="panel stk">
      <h2 style={{ fontSize: 22 }}>{title}</h2>
      <p>{text}</p>
      {button}
    </div>
  );

  // ---- Left column: report information ----
  const leftColumn = (
    <div className="panel">
      <div className="steps4">
        {STEPS.map((s, i) => (
          <span key={s} className={i === step ? 'on' : ''}>{s}</span>
        ))}
      </div>

      <Photo r={r} height={200} />
      <h2 style={{ fontSize: 26, margin: '16px 0 8px' }}>{r.title}</h2>
      <span className={'badge s-' + r.status}>{STAT[r.status]}</span>

      <div className="rows" style={{ marginTop: 8 }}>
        <div><b>Category</b><span>{r.category}</span></div>
        <div>
          <b>{r.type === 'found' ? 'Found at' : 'Last seen'}</b>
          <span>{r.location_note}</span>
        </div>
        <div><b>Date</b><span>{fmt(r.event_date)}</span></div>
        {r.type === 'found' && (
          <div><b>Item location</b><span>{ITEM_POSITIONS[r.item_position]}</span></div>
        )}
        {r.type === 'found' && r.custody_condition && (
          <div><b>Condition</b><span>{r.custody_condition}</span></div>
        )}
        <div>
          <b>{r.type === 'found' ? 'Finder' : 'Reporter'}</b>
          <span>Lostwise user</span>
        </div>
      </div>

      <p style={{ margin: '14px 0', fontSize: 14, color: 'var(--fg2)' }}>{r.description}</p>

      {r.type === 'found' &&
        (mine || otherAdmin ? (
          <div className="tipbox">
            <b>Secret feature (only the finder{otherAdmin ? ' and admin' : ''}):</b> {r.secret_feature}
          </div>
        ) : (
          <div className="tipbox">
            Secret feature hidden. Only the finder knows it and uses it for verification.
          </div>
        ))}

      {mine && ACTIVE.includes(r.status) && (
        <div style={{ marginTop: 14 }}>
          <button className="btn net" onClick={() => go('edit', r.id)}>Edit report</button>
        </div>
      )}
    </div>
  );

  // ---- Right column: content depends on who is viewing and the report status ----
  let rightColumn;

  if (!user) {
    // Not logged in
    rightColumn = (
      <div className="panel" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ fontSize: 22 }}>Is this item yours?</h2>
        <p>Log in to contact the finder and prove ownership through chat.</p>
        <button className="btn pri lg" onClick={() => go('login')}>Log in</button>
        <button className="btn out lg" onClick={() => go('signup')}>Sign up</button>
        <div className="info">
          The secret feature and the finder’s full name are only visible after logging in and an approved claim.
        </div>
      </div>
    );
  } else if (r.type === 'lost' && (mine || otherAdmin)) {
    // Lost report, seen by its owner or an admin: finders who started a chat
    rightColumn = (
      <div className="panel chat">
        <h3 style={{ fontSize: 20 }}>{otherAdmin ? 'Chats on this report' : 'Chat with finders'}</h3>
        {claimList.length ? (
          <>
            <div className="chips" style={{ margin: 0 }}>
              {claimList.map((c) => (
                <span
                  key={c.id}
                  className={'chip ' + (c === openClaim ? 'on' : '')}
                  onClick={() => setClaimTab(c.id)}
                >
                  {initials(c.name)} · {c.status}
                </span>
              ))}
            </div>
            <Chat key={openClaim.id} id={openClaim.id} me={user.id} ro={otherAdmin} reload={load} go={go} />
          </>
        ) : (
          <div className="info">
            Nobody says they found this item yet. You will be notified when a finder starts a chat.
          </div>
        )}
      </div>
    );
  } else if (r.type === 'lost' && activeClaimId) {
    // Lost report, finder who already started a chat
    rightColumn = (
      <div className="panel chat">
        <div>
          <h3 style={{ fontSize: 20 }}>Chat with the owner</h3>
          <div className="sm">You said: I found this</div>
        </div>
        <Chat id={activeClaimId} me={user.id} reload={load} go={go} />
      </div>
    );
  } else if (r.type === 'lost') {
    // Lost report, someone who has not started a chat
    rightColumn =
      r.status === 'lost'
        ? actionPanel(
            'Did you find this item?',
            'Start a chat with the owner. No found report needed. Once the owner confirms with a photo, you still get your points.',
            <>
              <button className="btn pri lg" onClick={startFind}>I found this item</button>
              {reportButton}
            </>
          )
        : actionPanel('Returned to its owner', 'This item is already back with its owner.', reportButton);
  } else if (mine || otherAdmin) {
    // Found report, seen by the finder or an admin: claim list + chat
    rightColumn = (
      <div className="panel chat">
        <h3 style={{ fontSize: 20 }}>{otherAdmin ? 'Claims on this report' : 'Chat with the claimant'}</h3>
        {claimList.length ? (
          <>
            <div className="chips" style={{ margin: 0 }}>
              {claimList.map((c) => (
                <span
                  key={c.id}
                  className={'chip ' + (c === openClaim ? 'on' : '')}
                  onClick={() => setClaimTab(c.id)}
                >
                  {initials(c.name)} · {c.status}
                </span>
              ))}
            </div>
            <Chat
              key={openClaim.id}
              id={openClaim.id}
              me={user.id}
              ro={otherAdmin}
              reload={load}
              go={go}
            />
          </>
        ) : (
          <div className="info">
            Nobody has claimed this item yet. You will be notified when a new claim arrives.
          </div>
        )}
      </div>
    );
  } else if (activeClaimId) {
    // Found report, claimant who has already started a claim
    rightColumn = (
      <div className="panel chat">
        <div>
          <h3 style={{ fontSize: 20 }}>Chat with the finder</h3>
          <div className="sm">Claim: This is mine</div>
        </div>
        <Chat id={activeClaimId} me={user.id} reload={load} go={go} />
      </div>
    );
  } else if (r.status !== 'found') {
    // Report is not accepting new claims
    rightColumn = actionPanel(
      r.status === 'claim_in_progress' ? 'Being claimed' : 'Returned to its owner',
      'This report is not accepting new claims.',
      reportButton
    );
  } else {
    // Can start a claim
    rightColumn = actionPanel(
      'Is this item yours?',
      'Start a claim, then answer the finder’s questions in chat to prove ownership.',
      <>
        <button className="btn pri lg" onClick={startClaim}>This is mine</button>
        {reportButton}
      </>
    );
  }

  return (
    <div className="pg">
      <div style={{ marginBottom: 16 }}>
        <a onClick={() => go('home')}>← Back to list</a>
      </div>
      <div className="two">
        {leftColumn}
        {rightColumn}
      </div>
    </div>
  );
}
