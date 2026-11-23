import { INGREDIENTS } from '../data/constants.js';
import { Button, Card, Toggle, useNotify } from '../components/ui.jsx';

export default function Settings({ app, actions, go }) {
  const notify = useNotify();
  const s = app.settings;
  const blocked = new Set(s.ekadashiBlocked);
  const unavailable = app.foods.filter((f) => f.available === false).length;

  const ask = async (cfg, fn, done) => { if (await notify.confirm(cfg)) { fn(); if (done) notify.show(done); } };

  return (
    <div className="screen">
      <h1 className="screen-title">Settings</h1>

      <Card>
        <h2 className="step-title">👤 Greeting name</h2>
        <input className="input" value={s.motherName || ''} maxLength={20} onChange={(e) => actions.updateSettings({ motherName: e.target.value })} aria-label="Name shown in greeting" />
      </Card>

      <Card>
        <h2 className="step-title">🍽️ Lunch preferences</h2>
        <div className="setting-row">
          <div><strong>Side dishes in lunch</strong><div className="muted small">Papad, curd, pickle, raita, salad, rasam…</div></div>
          <div className="stepper">
            <button className="icon-btn" aria-label="Fewer side dishes" onClick={() => actions.updateSettings({ sideCount: Math.max(0, s.sideCount - 1) })}>−</button>
            <span className="stepper-val" aria-live="polite">{s.sideCount}</span>
            <button className="icon-btn" aria-label="More side dishes" onClick={() => actions.updateSettings({ sideCount: Math.min(4, s.sideCount + 1) })}>＋</button>
          </div>
        </div>
        <div className="setting-row">
          <div><strong>Don't repeat a dish for</strong><div className="muted small">Recently made dishes are chosen less often</div></div>
          <select className="input select-sm" value={s.avoidDays} onChange={(e) => actions.updateSettings({ avoidDays: Number(e.target.value) })}>
            {[3, 7, 14, 21].map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
        </div>
      </Card>

      <Card>
        <h2 className="step-title">🪔 Ekadashi restrictions</h2>
        <p className="muted">Every household follows Ekadashi a little differently. Switch ON what you eat; OFF removes every dish containing it.</p>
        <ul className="toggle-list">
          {INGREDIENTS.map((i) => (
            <li key={i.id} className="setting-row slim">
              <span>{i.locked && '🔒 '}{i.label}</span>
              {i.locked ? <span className="locked-note">Never allowed</span> : (
                <Toggle checked={!blocked.has(i.id)} onChange={(v) => actions.setEkadashiAllowed(i.id, v)} label={blocked.has(i.id) ? 'Not allowed' : 'Allowed'} />
              )}
            </li>
          ))}
        </ul>
        <Button variant="soft" onClick={() => go('foods', { cat: 'ekadashi' })}>Choose individual Ekadashi dishes →</Button>
      </Card>

      <Card>
        <h2 className="step-title">📚 Foods</h2>
        <div className="btn-stack">
          <Button variant="soft" onClick={() => go('foods')}>Manage food database</Button>
          <Button variant="ghost" onClick={() => go('foods', { onlyOff: true })}>Enable / disable foods ({unavailable} unavailable)</Button>
          <Button variant="ghost" onClick={() => notify.show(`${actions.restoreMissingDefaults()} missing default dishes restored`)}>Restore missing default dishes</Button>
          <Button variant="danger-soft" onClick={() => ask({ title: 'Reset all foods?', message: 'This puts the original food list back and removes dishes you added or edited.', confirmLabel: 'Yes, reset foods', danger: true }, actions.resetFoods, 'Food list reset')}>Reset food list to original</Button>
        </div>
      </Card>

      <Card>
        <h2 className="step-title">🗓️ History</h2>
        <p className="muted">{app.history.length} plans remembered.</p>
        <Button variant="danger-soft" onClick={() => ask({ title: 'Clear meal history?', message: 'All saved and past meal plans will be removed. Dishes will no longer be avoided.', confirmLabel: 'Yes, clear history', danger: true }, actions.resetHistory, 'History cleared')}>Reset meal history</Button>
      </Card>

      <p className="center muted small">Meal Planner v1.0 · Works offline · No accounts, no internet needed</p>
    </div>
  );
}
