import { useState } from 'react';
import {
  BF_SIDE_KINDS, FOOD_TYPES, GOES_KEYS, INGREDIENTS, NV_KINDS, PROTEINS, RICE_VARIANTS, SIDE_KINDS,
} from '../data/constants.js';
import { validateFood, formToFood } from '../engine/validation.js';
import { Button, Chip, Field, Modal } from './ui.jsx';

const GOES_TYPES = ['curry', 'palya', 'dal', 'sambar', 'nv_main', 'side'];

export default function FoodForm({ initial, existing, foods, onSave, onClose }) {
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const toggleIn = (key, id) =>
    set({ [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id] });

  const typeInfo = FOOD_TYPES.find((t) => t.id === f.type);

  const changeType = (type) => {
    const info = FOOD_TYPES.find((t) => t.id === type);
    let meals = f.meals.filter((m) => info.meals.includes(m));
    if (!meals.length) meals = [info.meals[0]];
    const patch = { type, meals };
    if (type === 'nv_main') { patch.diet = 'nonveg'; patch.kind = 'gravy'; patch.ekadashi = false; }
    else if (f.type === 'nv_main') { patch.kind = type === 'bf_side' ? 'chutney' : 'other'; }
    if (type === 'bf_side' && !BF_SIDE_KINDS.some((k) => k.id === f.kind)) patch.kind = 'chutney';
    if (type === 'side' && !SIDE_KINDS.some((k) => k.id === f.kind)) patch.kind = 'other';
    set(patch);
  };

  const submit = () => {
    const errs = validateFood(f, foods, existing?.id || null);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSave(formToFood(f, existing));
  };

  const kindOptions = f.type === 'bf_side' ? BF_SIDE_KINDS : f.type === 'nv_main' ? NV_KINDS : SIDE_KINDS;

  return (
    <Modal
      wide
      title={existing ? `Edit ${existing.name}` : 'Add a new dish'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} icon="✓">{existing ? 'Save changes' : 'Add dish'}</Button>
        </>
      }
    >
      <Field label="Dish name" error={errors.name}>
        <input className="input" value={f.name} maxLength={60} autoFocus placeholder="e.g. Methi thepla"
          onChange={(e) => set({ name: e.target.value })} />
      </Field>

      <Field label="What kind of dish is it?" error={errors.type}>
        <select className="input" value={f.type} onChange={(e) => changeType(e.target.value)}>
          {FOOD_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </Field>

      <Field label="Which meal?" error={errors.meals}>
        <div className="chip-row">
          {['breakfast', 'lunch'].map((m) => (
            <Chip key={m} active={f.meals.includes(m)} disabled={!typeInfo?.meals.includes(m)} onClick={() => toggleIn('meals', m)}>
              {m === 'breakfast' ? '🌅 Breakfast' : '☀️ Lunch'}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Vegetarian or non-vegetarian?" error={errors.diet}>
        <div className="chip-row">
          <Chip active={f.diet === 'veg'} disabled={f.type === 'nv_main'} onClick={() => set({ diet: 'veg', protein: '' })}>🥗 Vegetarian</Chip>
          <Chip active={f.diet === 'nonveg'} onClick={() => set({ diet: 'nonveg', ekadashi: false, ekadashiOnly: false })}>🍗 Non-vegetarian</Chip>
        </div>
      </Field>

      {f.diet === 'nonveg' && (
        <Field label="Which protein?" error={errors.protein}>
          <div className="chip-row">
            {PROTEINS.filter((p) => p.id !== 'any').map((p) => (
              <Chip key={p.id} active={f.protein === p.id} onClick={() => set({ protein: p.id })}>{p.emoji} {p.label}</Chip>
            ))}
          </div>
        </Field>
      )}

      {f.type === 'rice' && (
        <Field label="How is this rice served?" error={errors.variant}>
          <select className="input" value={f.variant} onChange={(e) => set({ variant: e.target.value })}>
            {RICE_VARIANTS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </Field>
      )}

      {['side', 'bf_side', 'nv_main'].includes(f.type) && (
        <Field label={f.type === 'nv_main' ? 'Style' : 'Kind of side'}>
          <select className="input" value={f.kind} onChange={(e) => set({ kind: e.target.value })}>
            {kindOptions.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </Field>
      )}

      {GOES_TYPES.includes(f.type) && (
        <Field label="Goes well with" error={errors.goes} hint="The planner only serves this dish with the choices ticked here.">
          <div className="chip-row">
            {GOES_KEYS.map((g) => (
              <Chip key={g.id} active={f.goes.includes(g.id)} onClick={() => toggleIn('goes', g.id)}>{g.label}</Chip>
            ))}
          </div>
        </Field>
      )}

      {f.type === 'bf_main' && (
        <Field label="Usually served with" hint="One of each ticked item is added to the breakfast.">
          <div className="chip-row">
            {BF_SIDE_KINDS.map((k) => (
              <Chip key={k.id} active={f.accompKinds.includes(k.id)} onClick={() => toggleIn('accompKinds', k.id)}>{k.label}</Chip>
            ))}
          </div>
        </Field>
      )}

      <Field label="Ekadashi" error={errors.ekadashi}>
        <div className="chip-row">
          <Chip active={f.ekadashi} disabled={f.diet === 'nonveg'} onClick={() => set({ ekadashi: !f.ekadashi, ekadashiOnly: f.ekadashi ? false : f.ekadashiOnly })}>
            🪔 Ekadashi-compatible
          </Chip>
          {f.ekadashi && (
            <Chip active={f.ekadashiOnly} onClick={() => set({ ekadashiOnly: !f.ekadashiOnly })} title="Never shown on normal days">
              Only on Ekadashi days
            </Chip>
          )}
        </div>
      </Field>

      <Field label="Contains (used for Ekadashi rules)" hint="Tick what goes into the dish. Onion, garlic and rice cannot be Ekadashi.">
        <div className="chip-row">
          {INGREDIENTS.filter((i) => i.id !== 'nonveg').map((i) => (
            <Chip key={i.id} active={f.ingredients.includes(i.id)} onClick={() => toggleIn('ingredients', i.id)}>{i.label}</Chip>
          ))}
        </div>
      </Field>

      <Field label="Notes (optional)">
        <textarea className="input" rows={2} maxLength={200} value={f.notes} placeholder="Any reminder, e.g. 'soak dal the night before'"
          onChange={(e) => set({ notes: e.target.value })} />
      </Field>

      <label className="check-line">
        <input type="checkbox" checked={f.available} onChange={(e) => set({ available: e.target.checked })} />
        <span>Available right now (untick if ingredients are not at home)</span>
      </label>

      {Object.keys(errors).length > 0 && <div className="notice notice-warn">Please fix the highlighted items above.</div>}
    </Modal>
  );
}
