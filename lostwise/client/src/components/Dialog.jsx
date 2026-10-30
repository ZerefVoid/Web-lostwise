import { api } from '../api.js';
import ReportForm from './ReportForm.jsx';

// Choose the type of report to create
function ChooseType({ close, go }) {
  const start = (type) => {
    close();
    go('new-report', type);
  };

  return (
    <>
      <h3>Create report</h3>
      <p className="sm">What would you like to report?</p>
      <div className="act" style={{ justifyContent: 'stretch', flexDirection: 'column' }}>
        <button className="btn drk lg" onClick={() => start('lost')}>I lost something</button>
        <button className="btn outd lg" onClick={() => start('found')}>I found something</button>
        <button className="btn net" onClick={close}>Cancel</button>
      </div>
    </>
  );
}

// Confirm withdrawing the report
function WithdrawReport({ d, close, setDlg, go, reload, toast }) {
  const withdraw = async () => {
    try {
      await api(`/reports/${d.id}/withdraw`, { body: {} });
      close();
      toast('Report withdrawn. Your slot is open again.');
      await reload();
      go('mine', Date.now());
    } catch (x) {
      setDlg({ t: 'ok', title: 'Failed', msg: x.message });
    }
  };

  return (
    <>
      <h3>Withdraw report?</h3>
      <p style={{ fontSize: 14 }}>
        The report will no longer be public and withdrawing cannot be undone. Your report slot will open again.
      </p>
      <div className="sm"><b>{d.name}</b></div>
      <div className="act">
        <button className="btn net" onClick={close}>Cancel</button>
        <button className="btn danger" onClick={withdraw}>Withdraw report</button>
      </div>
    </>
  );
}

// Confirm cancelling the handover
function CancelHandover({ d, close, setDlg, go, reload, toast }) {
  const cancel = async () => {
    try {
      await api(`/claims/${d.id}/cancel-handover`, { body: {} });
      close();
      toast('Handover cancelled. The report is back to Found.');
      await reload();
      go('detail', d.rid);
    } catch (x) {
      setDlg({ t: 'ok', title: 'Failed', msg: x.message });
    }
  };

  return (
    <>
      <h3>Cancel the handover?</h3>
      <p style={{ fontSize: 14 }}>
        Use this if, after meeting, the person turns out not to be the owner. The handover is cancelled, their claim is closed, the report returns to Found, and other claims closed because of your choice are reopened.
      </p>
      <div className="sm"><b>{d.name}</b></div>
      <div className="act">
        <button className="btn net" onClick={close}>Cancel</button>
        <button className="btn danger" onClick={cancel}>Yes, cancel it</button>
      </div>
    </>
  );
}

// Simple message with a "Got it" button
function Notice({ d, close }) {
  return (
    <>
      <h3>{d.title}</h3>
      <p style={{ fontSize: 14 }}>{d.msg}</p>
      <div className="act">
        <button className="btn pri" onClick={close}>Got it</button>
      </div>
    </>
  );
}

// Global dialog. Its kind is set by d.t:
// choose | withdraw | cancel_handover | rpt | ok
export default function Dialog({ d, setDlg, go, reload, toast }) {
  if (!d) return null;

  const close = () => setDlg(null);
  const props = { d, close, setDlg, go, reload, toast };

  let body;
  if (d.t === 'choose') body = <ChooseType {...props} />;
  if (d.t === 'withdraw') body = <WithdrawReport {...props} />;
  if (d.t === 'cancel_handover') body = <CancelHandover {...props} />;
  if (d.t === 'rpt') body = <ReportForm {...props} />;
  if (d.t === 'ok') body = <Notice {...props} />;

  return (
    <div className="ovl" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="dlg" role="dialog" aria-modal="true">{body}</div>
    </div>
  );
}
