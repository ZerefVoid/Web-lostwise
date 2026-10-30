import { useState, useEffect, useCallback } from 'react';
import { Ctx } from './context.js';
import { api } from './api.js';

import Header from './components/Header.jsx';
import Dialog from './components/Dialog.jsx';
import Toast from './components/Toast.jsx';

import Home from './pages/Home.jsx';
import ItemList from './pages/ItemList.jsx';
import Detail from './pages/Detail.jsx';
import NewReport from './pages/NewReport.jsx';
import EditReport from './pages/EditReport.jsx';
import Auth from './pages/Auth.jsx';
import MyReports from './pages/MyReports.jsx';
import Handover from './pages/Handover.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Notifications from './pages/Notifications.jsx';
import Help from './pages/Help.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/admin/Admin.jsx';
import ReviewComplaint from './pages/admin/ReviewComplaint.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [route, setRoute] = useState({ p: 'home' }); // p = page name, x = its parameter
  const [dlg, setDlg] = useState(null);
  const [toastMessage, setMessageToast] = useState(null);

  const page = route.p;
  const admin = user && user.role === 'admin';
  const full = user && user.active_reports >= user.limit;

  // ---- Toast ----
  const toast = (text) => {
    setMessageToast(text);
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => setMessageToast(null), 2600);
  };

  // ---- User and category data ----
  const reload = useCallback(() => api('/auth/me').then(setUser), []);

  useEffect(() => {
    reload();
    api('/categories').then(setCategories);
  }, [reload]);

  // Refresh user data every 15 seconds (notification count and report slots)
  useEffect(() => {
    const timer = setInterval(() => user && reload(), 15000);
    return () => clearInterval(timer);
  }, [user, reload]);

  // ---- Navigation ----
  const go = (p, x) => {
    setRoute({ p, x });
    window.scrollTo(0, 0);
  };

  // ---- "Create report" button ----
  // no type: show a dialog to choose lost or found
  const create = (type) => {
    if (!user) return go('login');

    if (full) {
      return setDlg({
        t: 'ok',
        title: 'Report slots full',
        msg: 'You already have 3 active reports. Finish or withdraw one to create a new report.',
      });
    }

    if (type) go('new-report', type);
    else setDlg({ t: 'choose' });
  };

  const logout = async () => {
    await api('/auth/logout', { body: {} });
    setUser(null);
    go('home');
  };

  // Pages that need login use this when not logged in
  const loginPage = <Auth mode="login" go={go} reload={reload} />;
  const adminOnly = <div className="pg"><div className="panel">This page is for admins only.</div></div>;

  return (
    <Ctx.Provider value={{ setDlg, toast }}>
      <Header
        user={user}
        admin={admin}
        page={page}
        full={full}
        go={go}
        create={create}
        logout={logout}
      />

      {/* Public pages */}
      {page === 'home' && <Home go={go} categories={categories} create={create} full={full} />}
      {(page === 'lost' || page === 'found') && (
        <ItemList key={page} j={page} go={go} categories={categories} create={create} full={full} />
      )}
      {page === 'detail' && <Detail key={route.x} id={route.x} user={user} go={go} reload={reload} />}
      {(page === 'login' || page === 'signup') && (
        <Auth key={page} mode={page} go={go} reload={reload} />
      )}
      {page === 'handover' && <Handover id={route.x} go={go} />}
      {page === 'leaderboard' && <Leaderboard />}
      {page === 'help' && <Help />}

      {/* Pages that require login */}
      {page === 'new-report' && (user
        ? <NewReport key={route.x} j={route.x} categories={categories} user={user} go={go} reload={reload} />
        : loginPage)}
      {page === 'mine' && (user ? <MyReports go={go} create={create} /> : loginPage)}
      {page === 'notifications' && (user ? <Notifications go={go} /> : loginPage)}
      {page === 'edit' && (user
        ? <EditReport key={route.x} id={route.x} categories={categories} go={go} reload={reload} toast={toast} setDlg={setDlg} />
        : loginPage)}
      {page === 'profile' && (user ? <Profile /> : loginPage)}

      {/* Admin pages */}
      {page === 'admin' && (admin ? <Admin user={user} go={go} toast={toast} /> : adminOnly)}
      {page === 'review' && (admin
        ? <ReviewComplaint key={route.x} id={route.x} user={user} go={go} toast={toast} setDlg={setDlg} />
        : adminOnly)}

      <Dialog d={dlg} setDlg={setDlg} go={go} reload={reload} toast={toast} />
      <Toast t={toastMessage} />
    </Ctx.Provider>
  );
}
