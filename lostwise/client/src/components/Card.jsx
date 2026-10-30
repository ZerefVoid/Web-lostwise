import { STAT, ITEM_POSITIONS } from '../constants.js';
import { fmt } from '../utils.js';

// Report card in lists (home, lost items, found items)
export default function Card({ r, go }) {
  const open = () => go('detail', r.id);
  const location = r.location_note || '';

  let button;
  if (r.status === 'claim_in_progress') {
    button = <button className="btn off" disabled>Being claimed</button>;
  } else if (r.status === 'returned') {
    button = <button className="btn off" disabled>Returned to its owner</button>;
  } else {
    button = (
      <button className={'btn ' + (r.type === 'lost' ? 'out' : 'pri')} onClick={open}>
        {r.type === 'lost' ? 'I found it' : 'This is mine'}
      </button>
    );
  }

  return (
    <div className={'card' + (r.status === 'returned' ? ' fade' : '')}>
      <div
        className={'ph ' + (r.photo_url ? '' : 'no')}
        onClick={open}
        style={{
          cursor: 'pointer',
          ...(r.photo_url ? { backgroundImage: `url(${r.photo_url})` } : {}),
        }}
      >
        <span className={'b1 badge s-' + r.status}>{STAT[r.status]}</span>
        <span className="b2">{r.category}</span>
        {!r.photo_url && 'No photo'}
      </div>

      <div className="cb">
        <h3 onClick={open}>{r.title}</h3>
        <div className="sm">{location.length > 46 ? location.slice(0, 46) + '…' : location}</div>
        <div className="sm">{fmt(r.event_date)} · Lostwise user</div>

        <div className="tags">
          {r.reward && <span className="tag t-rw">Reward: {r.reward}</span>}
          {r.type === 'found' && <span className="tag t-loc">{ITEM_POSITIONS[r.item_position]}</span>}
          {r.card_masked ? <span className="tag t-rw">Card details hidden</span> : null}
        </div>

        {button}
      </div>
    </div>
  );
}
