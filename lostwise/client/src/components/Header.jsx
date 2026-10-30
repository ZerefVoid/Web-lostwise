import { LOGO, BELL } from './Icons.jsx';
import { initials } from '../utils.js';

// Top bar: logo, menu, and buttons that depend on login status
export default function Header({ user, admin, page, full, go, create, logout }) {
  const active = (name) => (page === name ? 'on' : '');

  return (
    <div className="hdr">
      <div className="logo" onClick={() => go('home')}>{LOGO}Lostwise</div>

      <nav className="nav">
        <a className={active('home')} onClick={() => go('home')}>Home</a>
        <a className={active('lost')} onClick={() => go('lost')}>Lost items</a>
        <a className={active('found')} onClick={() => go('found')}>Found items</a>
        <a className={active('help')} onClick={() => go('help')}>How it works</a>
        <a className={active('leaderboard')} onClick={() => go('leaderboard')}>Leaderboard</a>
      </nav>

      <div className="hr">
        {user ? (
          <>
            {admin ? (
              <a
                onClick={() => go('admin')}
                style={page === 'admin' || page === 'review' ? { fontWeight: 700 } : {}}
              >
                Admin panel
              </a>
            ) : (
              <a onClick={() => go('mine')}>My reports</a>
            )}

            <span className="bell" onClick={() => go('notifications')} title="Notifications">
              {BELL}
              {user.unread > 0 && <i>{user.unread}</i>}
            </span>

            <span className="av" style={{ cursor: 'pointer' }} title="Profile" onClick={() => go('profile')}>
              {initials(user.name)}
            </span>

            <button className="btn net" onClick={logout}>Log out</button>

            {!admin && (
              <button className={'btn pri ' + (full ? 'off' : '')} onClick={() => create()}>
                Create report
              </button>
            )}
          </>
        ) : (
          <>
            <button className="btn out" onClick={() => go('login')}>Log in</button>
            <button className="btn pri" onClick={() => create()}>Create report</button>
          </>
        )}
      </div>
    </div>
  );
}
