import { useMemo, useState } from 'react';
import { FOOD_TYPES, INGREDIENT_LABEL, PROTEINS, TYPE_LABEL } from '../data/constants.js';
import { blankForm, foodToForm } from '../engine/validation.js';
import FoodForm from '../components/FoodForm.jsx';
import { Badge, Button, Chip, Toggle, foodEmoji, useNotify } from '../components/ui.jsx';

const inCategory = (f, c) =>
  c === 'all' ? true : c === 'veg' ? f.diet === 'veg' && !f.ekadashiOnly : c === 'nonveg' ? f.diet === 'nonveg' : !!f.ekadashi;

export default function Foods({ app, actions, initialFilter }) {
  const notify = useNotify();
  const [q, setQ] = useState('');
  const [meal, setMeal] = useState(initialFilter?.meal || 'all');
  const [cat, setCat] = useState(initialFilter?.cat || 'all');
  const [type, setType] = useState('all');
  const [onlyOff, setOnlyOff] = useState(!!initialFilter?.onlyOff);
  const [editing, setEditing] = useState(null); // { existing?, form }

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return app.foods
      .filter((f) => (meal === 'all' ? true : f.meals.includes(meal)))
      .filter((f) => inCategory(f, cat))
      .filter((f) => (type === 'all' ? true : f.type === type))
      .filter((f) => (onlyOff ? f.available === false : true))
      .filter((f) => (needle ? f.name.toLowerCase().includes(needle) : true));
  }, [app.foods, q, meal, cat, type, onlyOff]);

  const groups = FOOD_TYPES.map((t) => [t, list.filter((f) => f.type === t.id).sort((a, b) => a.name.localeCompare(b.name))]).filter(([, l]) => l.length);

  const save = (food) => {
    const exists = app.foods.some((f) => f.id === food.id);
    if (exists) actions.updateFood(food); else actions.addFood(food);
    notify.show(exists ? `${food.name} updated` : `${food.name} added – the planner can use it now`);
    setEditing(null);
  };

  const remove = async (f) => {
    const ok = await notify.confirm({ title: 'Delete this dish?', message: `“${f.name}” will be removed from your food list.`, confirmLabel: 'Yes, delete', danger: true });
    if (ok) { actions.deleteFood(f.id); notify.show(`${f.name} deleted`); }
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <h1 className="screen-title">Food Database</h1>
        <Button icon="＋" onClick={() => setEditing({ form: blankForm() })}>Add new food</Button>
      </div>
      <p className="muted">{app.foods.length} dishes · {app.foods.filter((f) => f.available === false).length} marked unavailable. Anything you add is used by the planner automatically.</p>

      <input className="input search" type="search" placeholder="🔍 Search dishes…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search dishes" />

      <div className="filters">
        <div className="chip-row">
          {[['all', 'All meals'], ['breakfast', '🌅 Breakfast'], ['lunch', '☀️ Lunch']].map(([id, l]) => <Chip key={id} active={meal === id} onClick={() => setMeal(id)}>{l}</Chip>)}
        </div>
        <div className="chip-row">
          {[['all', 'All foods'], ['veg', '🥗 Veg'], ['nonveg', '🍗 Non-veg'], ['ekadashi', '🪔 Ekadashi']].map(([id, l]) => <Chip key={id} active={cat === id} onClick={() => setCat(id)}>{l}</Chip>)}
        </div>
        <div className="chip-row">
          <select className="input select-sm" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
            <option value="all">All types</option>
            {FOOD_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <Chip active={onlyOff} onClick={() => setOnlyOff(!onlyOff)}>⛔ Unavailable only</Chip>
        </div>
      </div>

      {!groups.length && <div className="empty"><div className="empty-emoji">🔎</div><p>No dishes match.</p></div>}

      {groups.map(([t, items]) => (
        <section key={t.id} className="food-group">
          <h3 className="section-label">{t.label} <span className="count">{items.length}</span></h3>
          <ul className="food-list">
            {items.map((f) => (
              <li key={f.id} className={`food ${f.available === false ? 'food-off' : ''}`}>
                <span className="food-emoji" aria-hidden="true">{foodEmoji(f.name)}</span>
                <div className="food-main">
                  <div className="food-name">{f.name}</div>
                  <div className="food-badges">
                    {f.meals.map((m) => <Badge key={m} tone="neutral">{m === 'breakfast' ? 'Breakfast' : 'Lunch'}</Badge>)}
                    {f.diet === 'nonveg' ? <Badge tone="terracotta">{PROTEINS.find((p) => p.id === f.protein)?.label || 'Non-veg'}</Badge> : <Badge tone="green">Veg</Badge>}
                    {f.ekadashi && <Badge tone="saffron">🪔 Ekadashi{f.ekadashiOnly ? ' only' : ''}</Badge>}
                    {f.custom && <Badge tone="neutral">Mine</Badge>}
                    {f.available === false && <Badge tone="red">Unavailable</Badge>}
                  </div>
                  {f.notes && <div className="food-notes">📝 {f.notes}</div>}
                  {f.ekadashi && f.ingredients?.length > 0 && <div className="food-notes">Contains: {f.ingredients.map((i) => INGREDIENT_LABEL[i] || i).join(', ')}</div>}
                </div>
                <div className="food-actions">
                  <Toggle checked={f.available !== false} onChange={(v) => actions.setAvailable(f.id, v)} label={<span className="sr-only">Available</span>} />
                  <button className="icon-btn" onClick={() => setEditing({ existing: f, form: foodToForm(f) })} aria-label={`Edit ${f.name}`} title="Edit">✏️</button>
                  <button className="icon-btn" onClick={() => remove(f)} aria-label={`Delete ${f.name}`} title="Delete">🗑️</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {editing && (
        <FoodForm initial={editing.form} existing={editing.existing} foods={app.foods} onSave={save} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
