import { useState } from 'react';
import { api } from '../api.js';

const REASONS = [
  'Scam, or claiming an item that is not theirs',
  'Inappropriate content',
  'Shows card details',
  'Spam or duplicate report',
  'Other',
];

// Content of the "Report this?" dialog for complaining about a report
export default function ReportForm({ d, close, toast }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');

  const send = async () => {
    try {
      await api('/complaints', { body: { type: 'report', target: d.id, reason, details } });
      close();
      toast('Report sent. Thanks for helping.');
    } catch (x) {
      setError(x.message);
    }
  };

  return (
    <>
      <h3>Report this?</h3>
      <p style={{ fontSize: 14, color: 'var(--fg2)' }}>
        Reports go to an admin for review. Your identity is not shown to the reported user.
      </p>

      <div>
        <label className="sm" style={{ color: 'var(--fg)' }}>Reason</label>
        <select className="inp" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>

      <div>
        <label className="sm" style={{ color: 'var(--fg)' }}>Additional details (optional)</label>
        <textarea
          className="inp"
          maxLength={255}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
      </div>

      <div className="sm" style={{ color: 'var(--redfg)' }}>{error}</div>

      <div className="act">
        <button className="btn net" onClick={close}>Cancel</button>
        <button className="btn pri" onClick={send}>Send report</button>
      </div>
    </>
  );
}
