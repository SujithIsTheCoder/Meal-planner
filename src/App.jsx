import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppState } from './store.js';
import { NotifyProvider } from './components/ui.jsx';
import Home from './screens/Home.jsx';
import Planner from './screens/Planner.jsx';
import Foods from './screens/Foods.jsx';
import History from './screens/History.jsx';
import Settings from './screens/Settings.jsx';

const TABS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'planner', label: 'Meal Planner', short: 'Planner', icon: '🍽️' },
  { id: 'foods', label: 'Food Database', short: 'Foods', icon: '📚' },
  { id: 'history', label: 'History', icon: '🗓️' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

const readTab = () => {
  const h = window.location.hash.replace('#/', '').replace('#', '');
  return TABS.some((t) => t.id === h) ? h : 'home';
};

function Shell() {
  const { app, current, actions } = useAppState();
  const [tab, setTab] = useState(readTab);
  const [foodsFilter, setFoodsFilter] = useState(null);
  const [autoGen, setAutoGen] = useState(false);
  const mainRef = useRef(null);

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((id, filter = null) => {
    setFoodsFilter(filter);
    if (window.location.hash !== `#/${id}`) window.location.hash = `#/${id}`;
    else setTab(id);
    window.scrollTo({ top: 0 });
  }, []);

  const generateNow = () => { setAutoGen(true); go('planner'); };
  const consumeAutoGen = useCallback(() => setAutoGen(false), []);

  let screen;
  if (tab === 'home') screen = <Home app={app} current={current} actions={actions} go={go} generateNow={generateNow} />;
  else if (tab === 'planner') screen = <Planner app={app} current={current} actions={actions} go={go} autoGen={autoGen} consumeAutoGen={consumeAutoGen} />;
  else if (tab === 'foods') screen = <Foods key={JSON.stringify(foodsFilter)} app={app} actions={actions} initialFilter={foodsFilter} />;
  else if (tab === 'history') screen = <History app={app} actions={actions} go={go} />;
  else screen = <Settings app={app} actions={actions} go={go} />;

  return (
    <div className="app">
      <aside className="sidebar" aria-label="Main">
        <div className="brand"><span className="brand-logo">🍛</span><span className="brand-name">Meal Planner</span></div>
        <nav className="nav">
          {TABS.map((t) => (
            <button key={t.id} className={`nav-item ${tab === t.id ? 'nav-on' : ''}`} onClick={() => go(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              <span className="nav-icon" aria-hidden="true">{t.icon}</span>
              <span className="nav-label"><span className="nav-full">{t.label}</span><span className="nav-short">{t.short || t.label}</span></span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="main" ref={mainRef}>{screen}</main>
    </div>
  );
}

export default function App() {
  return (
    <NotifyProvider>
      <Shell />
    </NotifyProvider>
  );
}
