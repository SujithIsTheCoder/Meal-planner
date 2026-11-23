// Meal generation engine. Pure JavaScript – no React, no network, no AI APIs.
//
// A "plan" looks like:
//   { id, date, category, options: {staple, protein, nvStaple},
//     breakfast: { slots: [...] }, lunch: { slots: [...] }, cooked: {...}, saved }
// A "slot" is one dish position:
//   { id, role, label, spec, foodId, foodName, rebuild }
// `spec` describes what may fill the slot, so a single slot can be re-rolled later
// without touching the rest of the meal.

import { ALL_GOES, BF_SIDE_KINDS, SIDE_KINDS, INGREDIENTS } from '../data/constants.js';

const KEY = { plain: 'plainRice', flav: 'flavRice', complete: 'completeRice' };
const KIND_LABEL = Object.fromEntries([...BF_SIDE_KINDS, ...SIDE_KINDS].map((k) => [k.id, k.label]));

// ───────────────────────── helpers ─────────────────────────

export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

export function newId(prefix = 'p') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function blockedSet(settings) {
  const s = new Set(settings?.ekadashiBlocked || []);
  INGREDIENTS.filter((i) => i.locked).forEach((i) => s.add(i.id)); // locked ones are always blocked
  return s;
}

/** Can this food be used at all for the given category / preferences? */
export function isEligible(food, ctx) {
  if (!food || food.available === false) return false;
  if (ctx.category === 'veg') return food.diet === 'veg' && !food.ekadashiOnly;
  if (ctx.category === 'nonveg') {
    if (food.ekadashiOnly) return false;
    if (food.diet === 'veg') return true;
    return ctx.protein === 'any' || food.protein === ctx.protein;
  }
  if (ctx.category === 'ekadashi') {
    if (food.diet !== 'veg' || !food.ekadashi) return false;
    const blocked = ctx.blocked instanceof Set ? ctx.blocked : new Set(ctx.blocked || []);
    return !(food.ingredients || []).some((i) => blocked.has(i));
  }
  return false;
}

function matches(f, meal, s) {
  if (!f.meals || !f.meals.includes(meal)) return false;
  if (!s.types.includes(f.type)) return false;
  const goes = f.goes && f.goes.length ? f.goes : ALL_GOES;
  if (s.goes && !goes.includes(s.goes)) return false;
  if (s.goesAll && !s.goesAll.every((k) => goes.includes(k))) return false;
  if (s.kinds && !s.kinds.includes(f.kind || 'other')) return false;
  if (s.variants && !s.variants.includes(f.variant || 'flav')) return false;
  return true;
}

/** Weight per food id based on how recently it was planned (lower = recently used). */
export function recencyWeights(history, today, excludePlanId, avoidDays = 14) {
  const w = new Map();
  for (const h of history || []) {
    if (h.id === excludePlanId) continue;
    const ago = daysBetween(h.date, today);
    if (ago < 0 || ago > avoidDays) continue;
    let factor = ago <= 1 ? 0.1 : ago <= 3 ? 0.3 : ago <= 7 ? 0.6 : 0.85;
    if (avoidDays <= 7) factor = Math.min(1, factor + 0.1);
    for (const m of ['breakfast', 'lunch']) {
      for (const s of h[m]?.slots || []) {
        const cur = w.get(s.foodId);
        w.set(s.foodId, cur === undefined ? factor : Math.min(cur, factor));
      }
    }
  }
  return w;
}

function makeEnv(foods, ctx, history, rng, excludePlanId) {
  const today = todayStr();
  return {
    ctx,
    rng,
    pool: foods.filter((f) => isEligible(f, ctx)),
    byId: new Map(foods.map((f) => [f.id, f])),
    recency: recencyWeights(history, today, excludePlanId, ctx.avoidDays ?? 14),
  };
}

function weightedPick(list, env) {
  if (!list.length) return null;
  const ws = list.map((f) => env.recency.get(f.id) ?? 1);
  const total = ws.reduce((a, b) => a + b, 0);
  let r = env.rng() * total;
  for (let i = 0; i < list.length; i++) {
    r -= ws[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

function newState(seedSlots = []) {
  const st = { slots: [], used: new Set(), groups: new Set(), kinds: new Set() };
  return st;
}

function seedFromSlots(st, env, slots, { sameMeal }) {
  for (const s of slots) {
    st.used.add(s.foodId);
    const f = env.byId.get(s.foodId);
    if (f?.group) st.groups.add(f.group);
    if (sameMeal && f) st.kinds.add(f.kind || 'other');
  }
}

function candidates(env, meal, spec, st, { avoid, strictGroup, distinct } = {}) {
  let list = env.pool.filter((f) => matches(f, meal, spec) && !st.used.has(f.id));
  if (distinct) list = list.filter((f) => !st.kinds.has(f.kind || 'other'));
  if (avoid && avoid.size) list = list.filter((f) => !avoid.has(f.id));
  const clean = list.filter((f) => !f.group || !st.groups.has(f.group));
  if (strictGroup) return clean;
  return clean.length ? clean : list;
}

let slotCounter = 0;
function fillSlot(env, meal, st, def, opts = {}) {
  const avoid = def.avoidable ? opts.avoid : null;
  let list = candidates(env, meal, def.spec, st, { avoid, strictGroup: def.optional, distinct: def.distinct });
  if (!list.length && avoid && avoid.size) {
    list = candidates(env, meal, def.spec, st, { strictGroup: def.optional, distinct: def.distinct });
  }
  const food = weightedPick(list, env);
  if (!food) return null;
  const slot = {
    id: `${meal}-${++slotCounter}`,
    role: def.role,
    label: def.label,
    spec: def.spec,
    distinct: !!def.distinct,
    optional: !!def.optional,
    rebuild: !!def.rebuild,
    avoidable: !!def.avoidable,
    foodId: food.id,
    foodName: food.name,
  };
  st.slots.push(slot);
  st.used.add(food.id);
  if (food.group) st.groups.add(food.group);
  st.kinds.add(food.kind || 'other');
  return { slot, food };
}

function hasCandidates(env, meal, spec, st, avoid) {
  return candidates(env, meal, spec, st, { avoid }).length > 0;
}

function pickVariant(env, st, avoid, weights, meal = 'lunch') {
  const avail = Object.keys(weights).filter((v) =>
    hasCandidates(env, meal, { types: ['rice'], variants: [v] }, st, avoid)
  );
  if (!avail.length) return null;
  const total = avail.reduce((a, v) => a + weights[v], 0);
  let r = env.rng() * total;
  for (const v of avail) {
    r -= weights[v];
    if (r <= 0) return v;
  }
  return avail[avail.length - 1];
}

function sideDefs(n, firstKinds, restKinds, goes) {
  const defs = [];
  for (let i = 0; i < n; i++) {
    const kinds = i === 0 ? firstKinds : restKinds;
    defs.push({ role: 'side', label: 'Side', spec: { types: ['side'], kinds, ...goes }, distinct: true });
  }
  return defs;
}

function fillAll(env, meal, st, defs, opts) {
  for (const d of defs) fillSlot(env, meal, st, d, opts);
}

// ───────────────────────── breakfast ─────────────────────────

function buildBreakfast(env, st, opts) {
  const main = fillSlot(
    env, 'breakfast', st,
    { role: 'main', label: 'Breakfast', spec: { types: ['bf_main'] }, rebuild: true, avoidable: true },
    opts
  );
  if (!main) return;
  for (const kinds of main.food.accomp || []) {
    fillSlot(env, 'breakfast', st, {
      role: 'accompaniment',
      label: kinds.length === 1 ? KIND_LABEL[kinds[0]] || 'Accompaniment' : 'Accompaniment',
      spec: { types: ['bf_side'], kinds },
      distinct: true,
    }, opts);
  }
}

// ───────────────────────── lunch ─────────────────────────

function vegRiceLunch(env, st, opts, weights, n, sidesCap) {
  const v = pickVariant(env, st, opts.avoid, weights);
  const spec = v ? { types: ['rice'], variants: [v] } : { types: ['rice'] };
  const r = fillSlot(env, 'lunch', st, { role: 'staple', label: 'Rice', spec, avoidable: true }, opts);
  if (!r) return null;
  const key = KEY[r.food.variant || 'flav'];
  return { key, n: Math.min(n, sidesCap ?? n) };
}

function vegLunch(env, st, opts) {
  const { staple, sideCount: n } = env.ctx;
  const g = (key) => ({ goes: key });

  if (staple === 'rice') {
    const info = vegRiceLunch(env, st, opts, { plain: 0.45, flav: 0.35, complete: 0.2 }, n);
    if (!info) return;
    const { key } = info;
    if (key === 'plainRice') {
      const sam = fillSlot(env, 'lunch', st, { role: 'curry', label: 'Sambar', spec: { types: ['sambar'], goes: key } }, opts);
      if (!sam) fillSlot(env, 'lunch', st, { role: 'curry', label: 'Dal', spec: { types: ['dal'], goes: key } }, opts);
      fillSlot(env, 'lunch', st, { role: 'curry', label: 'Palya / fry', spec: { types: ['palya', 'curry'], goes: key } }, opts);
      fillAll(env, 'lunch', st, sideDefs(n, ['curd', 'rasam'], ['papad', 'pickle', 'curd', 'rasam', 'salad'], g(key)), opts);
    } else if (key === 'flavRice') {
      fillSlot(env, 'lunch', st, { role: 'curry', label: 'Curry', spec: { types: ['curry', 'palya', 'dal'], goes: key } }, opts);
      fillAll(env, 'lunch', st, sideDefs(n, ['raita', 'salad'], ['papad', 'pickle', 'salad', 'raita'], g(key)), opts);
    } else {
      fillSlot(env, 'lunch', st, { role: 'curry', label: 'Palya / fry', spec: { types: ['palya', 'curry'], goes: key } }, opts);
      fillAll(env, 'lunch', st, sideDefs(n, ['raita', 'papad', 'salad'], ['papad', 'pickle', 'salad', 'raita'], g(key)), opts);
    }
    return;
  }

  if (staple === 'roti') {
    fillSlot(env, 'lunch', st, { role: 'staple', label: 'Chapati', spec: { types: ['roti'] }, avoidable: true }, opts);
    fillSlot(env, 'lunch', st, { role: 'curry', label: 'Main curry', spec: { types: ['curry', 'palya'], goes: 'roti' } }, opts);
    if (env.rng() < 0.5) {
      fillSlot(env, 'lunch', st, { role: 'curry', label: 'Dal', spec: { types: ['dal'], goes: 'roti' }, optional: true }, opts);
    }
    fillAll(env, 'lunch', st, sideDefs(n, ['raita', 'salad', 'curd'], ['pickle', 'salad', 'papad', 'raita', 'curd'], g('roti')), opts);
    return;
  }

  // both: keep it modest – one rice, one roti, one curry, at most one more dish and a side
  const info = vegRiceLunch(env, st, opts, { plain: 0.6, flav: 0.4 }, n, 2);
  if (!info) return;
  const { key } = info;
  fillSlot(env, 'lunch', st, { role: 'staple', label: 'Chapati', spec: { types: ['roti'] }, avoidable: true }, opts);
  fillSlot(env, 'lunch', st, {
    role: 'curry', label: 'Main curry', spec: { types: ['curry', 'palya', 'dal'], goesAll: ['roti', key] },
  }, opts);
  let sides = Math.min(n, 2);
  if (key === 'plainRice') {
    const sam = fillSlot(env, 'lunch', st, { role: 'curry', label: 'Sambar', spec: { types: ['sambar'], goes: key } }, opts);
    if (sam) sides = Math.min(sides, 1);
  }
  fillAll(env, 'lunch', st, sideDefs(sides, ['curd', 'raita', 'salad'], ['papad', 'pickle'], { goesAll: [key, 'roti'] }), opts);
}

function nonVegLunch(env, st, opts) {
  const { sideCount: n, nvStaple } = env.ctx;
  const mainRes = fillSlot(env, 'lunch', st, {
    role: 'main', label: 'Main dish', spec: { types: ['nv_main'] }, rebuild: true, avoidable: true,
  }, opts);
  if (!mainRes) return;
  const goes = mainRes.food.goes && mainRes.food.goes.length ? mainRes.food.goes : ALL_GOES;
  const complete = goes.length === 1 && goes[0] === 'completeRice';

  if (complete) {
    fillAll(env, 'lunch', st, sideDefs(n, ['raita', 'salad'], ['egg', 'salad', 'pickle', 'raita', 'papad'], { goes: 'completeRice' }), opts);
    return;
  }

  // choose staple according to preference and what the main dish goes with
  let want = nvStaple === 'roti' ? ['roti'] : nvStaple === 'any' ? (env.rng() < 0.7 ? ['plainRice', 'roti'] : ['roti', 'plainRice']) : ['plainRice', 'roti'];
  let key = want.find((k) => goes.includes(k)) || goes.find((k) => k !== 'completeRice') || 'plainRice';
  if (key === 'roti') {
    fillSlot(env, 'lunch', st, { role: 'staple', label: 'Chapati', spec: { types: ['roti'] } }, opts);
  } else {
    fillSlot(env, 'lunch', st, { role: 'staple', label: 'Rice', spec: { types: ['rice'], variants: ['plain'] } }, opts);
    key = 'plainRice';
  }
  if (mainRes.food.kind === 'dry') {
    if (key === 'roti') {
      fillSlot(env, 'lunch', st, { role: 'curry', label: 'Dal', spec: { types: ['dal'], goes: 'roti' }, optional: true }, opts);
    } else {
      fillSlot(env, 'lunch', st, { role: 'curry', label: 'Sambar', spec: { types: ['sambar'], goes: key } }, opts);
    }
  }
  const first = key === 'roti' ? ['raita', 'salad', 'curd'] : ['rasam', 'raita', 'salad'];
  fillAll(env, 'lunch', st, sideDefs(n, first, ['salad', 'raita', 'egg', 'papad', 'pickle', 'curd'], { goes: key }), opts);
}

function ekadashiLunch(env, st, opts) {
  const { sideCount: n } = env.ctx;
  const r = fillSlot(env, 'lunch', st, {
    role: 'staple', label: 'Staple', spec: { types: ['rice', 'roti'] }, rebuild: true, avoidable: true,
  }, opts);
  if (!r) return;
  const key = r.food.type === 'roti' ? 'roti' : KEY[r.food.variant || 'flav'];
  if (key !== 'completeRice') {
    fillSlot(env, 'lunch', st, { role: 'curry', label: 'Curry / sabzi', spec: { types: ['curry', 'palya'], goes: key } }, opts);
    if (n >= 3 && env.rng() < 0.4) {
      fillSlot(env, 'lunch', st, { role: 'curry', label: 'Second sabzi', spec: { types: ['curry', 'palya'], goes: key }, optional: true }, opts);
    }
  }
  fillAll(env, 'lunch', st, sideDefs(n, ['curd', 'raita'], ['fruit', 'papad', 'curd', 'raita', 'other'], { goes: key }), opts);
}

function buildLunch(env, st, opts) {
  if (env.ctx.category === 'veg') return vegLunch(env, st, opts);
  if (env.ctx.category === 'nonveg') return nonVegLunch(env, st, opts);
  return ekadashiLunch(env, st, opts);
}

// ───────────────────────── public API ─────────────────────────

function ctxFromPlan(plan, settings) {
  return {
    category: plan.category,
    staple: plan.options?.staple || 'rice',
    protein: plan.options?.protein || 'any',
    nvStaple: plan.options?.nvStaple || 'rice',
    sideCount: settings?.sideCount ?? 2,
    avoidDays: settings?.avoidDays ?? 14,
    blocked: blockedSet(settings),
  };
}

export function buildCtx(category, options, settings) {
  return ctxFromPlan({ category, options }, settings);
}

function lunchSignature(slots) {
  return slots
    .filter((s) => s.role !== 'side')
    .map((s) => s.foodId)
    .sort()
    .join('|');
}

function recentLunchSignatures(history, today, excludeId, days = 21) {
  const set = new Set();
  for (const h of history || []) {
    if (h.id === excludeId) continue;
    const ago = daysBetween(h.date, today);
    if (ago < 0 || ago > days) continue;
    if (h.category) set.add(lunchSignature(h.lunch?.slots || []));
  }
  return set;
}

function warningsFor(plan) {
  const w = [];
  if (!plan.breakfast.slots.length) w.push('No breakfast dish is available for this choice. Add or enable foods in Food Database.');
  if (!plan.lunch.slots.length) w.push('No lunch dish is available for this choice. Add or enable foods in Food Database.');
  return w;
}

/**
 * Generate a complete breakfast + lunch plan.
 * @param foods     full food database
 * @param category  'veg' | 'nonveg' | 'ekadashi'
 * @param options   { staple, protein, nvStaple }
 * @param settings  app settings (sideCount, ekadashiBlocked, avoidDays)
 * @param history   saved plan history (for variety)
 * @param opts      { rng, replaceId }
 */
export function generatePlan(foods, category, options, settings, history, opts = {}) {
  const rng = opts.rng || Math.random;
  const ctx = buildCtx(category, options, settings);
  const env = makeEnv(foods, ctx, history, rng, opts.replaceId);
  const today = todayStr();
  const seen = recentLunchSignatures(history, today, opts.replaceId);

  let best = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const bst = newState();
    buildBreakfast(env, bst, {});
    const lst = newState();
    seedFromSlots(lst, env, bst.slots, { sameMeal: false });
    buildLunch(env, lst, {});
    best = { breakfast: { slots: bst.slots }, lunch: { slots: lst.slots } };
    if (!lst.slots.length || !seen.has(lunchSignature(lst.slots))) break;
  }

  const plan = {
    id: opts.replaceId || newId(),
    date: today,
    createdAt: Date.now(),
    category,
    options: { staple: ctx.staple, protein: ctx.protein, nvStaple: ctx.nvStaple },
    breakfast: best.breakfast,
    lunch: best.lunch,
    cooked: { breakfast: false, lunch: false },
    saved: false,
  };
  plan.warnings = warningsFor(plan);
  return plan;
}

/** Re-roll only breakfast or only lunch. `avoidIds` steers the first dish away from its current value. */
export function regenerateMeal(plan, mealName, foods, settings, history, opts = {}) {
  const rng = opts.rng || Math.random;
  const ctx = ctxFromPlan(plan, settings);
  const env = makeEnv(foods, ctx, history, rng, plan.id);
  const other = mealName === 'breakfast' ? 'lunch' : 'breakfast';
  const avoid = opts.avoid || new Set(plan[mealName].slots.filter((s) => s.avoidable).map((s) => s.foodId));
  const today = todayStr();
  const seen = recentLunchSignatures(history, today, plan.id);

  let slots = [];
  for (let attempt = 0; attempt < 12; attempt++) {
    const st = newState();
    seedFromSlots(st, env, plan[other].slots, { sameMeal: false });
    if (mealName === 'breakfast') buildBreakfast(env, st, { avoid });
    else buildLunch(env, st, { avoid });
    slots = st.slots;
    if (mealName === 'breakfast' || !slots.length || !seen.has(lunchSignature(slots))) break;
  }
  const next = { ...plan, [mealName]: { slots }, cooked: { ...plan.cooked, [mealName]: false } };
  next.warnings = warningsFor(next);
  return next;
}

/**
 * Re-roll one dish. Returns { plan, ok, message }.
 * Dishes that other dishes depend on (staple, main dish, breakfast item) rebuild their meal
 * around the new choice; everything else is swapped in place.
 */
export function regenerateSlot(plan, mealName, slotId, foods, settings, history, opts = {}) {
  const rng = opts.rng || Math.random;
  const ctx = ctxFromPlan(plan, settings);
  const env = makeEnv(foods, ctx, history, rng, plan.id);
  const slots = plan[mealName].slots;
  const idx = slots.findIndex((s) => s.id === slotId);
  if (idx < 0) return { plan, ok: false, message: 'Dish not found.' };
  const slot = slots[idx];

  const noChoice = { plan, ok: false, message: 'No other choice is available for this dish. Add more dishes in Food Database.' };

  const rebuild = () => {
    const next = regenerateMeal(plan, mealName, foods, settings, history, { rng, avoid: new Set([slot.foodId]) });
    const first = next[mealName].slots.find((s) => s.avoidable) || next[mealName].slots[0];
    const before = slots.find((s) => s.avoidable) || slots[0];
    if (!first || (before && first.foodId === before.foodId)) return noChoice;
    return { plan: next, ok: true, message: 'Meal updated to match the new dish.', rebuilt: true };
  };

  if (slot.rebuild) return rebuild();

  // in-place swap
  const st = newState();
  const otherSlots = [...slots.filter((s) => s.id !== slotId)];
  const other = mealName === 'breakfast' ? 'lunch' : 'breakfast';
  seedFromSlots(st, env, plan[other].slots, { sameMeal: false });
  seedFromSlots(st, env, otherSlots, { sameMeal: true });
  st.used.add(slot.foodId); // never return the same dish
  const list = candidates(env, mealName, slot.spec, st, { strictGroup: false, distinct: slot.distinct });
  const food = weightedPick(list, env);
  if (!food) {
    if (slot.role === 'staple') return rebuild();
    return noChoice;
  }
  const updated = slots.map((s) => (s.id === slotId ? { ...s, foodId: food.id, foodName: food.name } : s));
  return {
    plan: { ...plan, [mealName]: { slots: updated }, cooked: { ...plan.cooked, [mealName]: false } },
    ok: true,
  };
}

/** Rebuild a plan from an old one using today's date (history "reuse"). */
export function clonePlanForToday(plan) {
  return {
    ...plan,
    id: newId(),
    date: todayStr(),
    createdAt: Date.now(),
    cooked: { breakfast: false, lunch: false },
    saved: false,
    warnings: [],
  };
}

export const __test = { matches, candidates, lunchSignature };
