import { useState } from 'react';
import { api } from '../api.js';
import { LOGO } from '../components/Icons.jsx';

const labelStyle = { color: 'var(--fg)' };

// Log in (mode = 'login') and sign up (mode = 'signup') page
export default function Auth({ mode, go, reload }) {
  const isSignup = mode === 'signup';
  const [D, setD] = useState({});
  const [error, setError] = useState('');

  const setField = (key) => (e) => setD({ ...D, [key]: e.target.value });

  const send = async () => {
    if (isSignup && !D.agree) return setError('Please accept the terms of use.');

    try {
      await api('/auth/' + (isSignup ? 'signup' : 'login'), {
        body: { name: D.name, email: D.email, password: D.pass },
      });
      await reload();
      go('home');
    } catch (x) {
      setError(x.message);
    }
  };

  return (
    <div className="auth">
      {/* Left column: explanation */}
      <div className="l">
        {LOGO}
        <h2>{isSignup ? 'Anyone on campus can use Lostwise.' : 'Welcome back.'}</h2>

        {isSignup ? (
          <>
            <p style={{ fontSize: 17 }}>
              <b>Any email</b><br />
              <span className="sm">Personal email works, and students can use a campus email too.</span>
            </p>
            <p style={{ fontSize: 17 }}>
              <b>No admin approval</b><br />
              <span className="sm">Accounts are active right after signing up.</span>
            </p>
          </>
        ) : (
          <p style={{ fontSize: 17, color: 'var(--fg2)' }}>
            Log in to report, claim items and track your reports.
          </p>
        )}

        <a onClick={() => go('home')}>Browse items without logging in</a>
      </div>

      {/* Right column: form */}
      <div className="r">
        <div className="card2">
          <h3>{isSignup ? 'Create account' : 'Log in'}</h3>

          {isSignup && (
            <div>
              <label className="sm" style={labelStyle}>Full name</label>
              <input className="inp" onChange={setField('name')} />
            </div>
          )}

          <div>
            <label className="sm" style={labelStyle}>Email</label>
            <input className="inp" type="email" placeholder="name@email.com" onChange={setField('email')} />
          </div>

          <div>
            <label className="sm" style={labelStyle}>Password</label>
            <input className="inp" type="password" onChange={setField('pass')} />
            {isSignup && <div className="sm">At least 8 characters.</div>}
          </div>

          {isSignup && (
            <label className="sm" style={{ display: 'flex', gap: 8 }}>
              <input type="checkbox" onChange={(e) => setD({ ...D, agree: e.target.checked })} />{' '}
              I agree to the terms of use, including chat history being kept for dispute resolution.
            </label>
          )}

          <div className="sm" style={{ color: 'var(--redfg)' }}>{error}</div>

          <button className="btn pri lg" style={{ width: '100%' }} onClick={send}>
            {isSignup ? 'Create account' : 'Log in'}
          </button>

          {!isSignup && (
            <div className="sm">
              Example accounts: riley@campus.edu, ben@campus.edu, admin@lostwise.app. Password: demo1234
            </div>
          )}

          <div className="sm" style={{ textAlign: 'center' }}>
            {isSignup ? (
              <>Already have an account? <a onClick={() => go('login')}>Log in</a></>
            ) : (
              <>Don’t have an account yet? <a onClick={() => go('signup')}>Sign up</a></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
