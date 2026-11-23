// App state + persistence (localStorage). All meal logic lives in engine/generator.js.
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_FOODS } from './data/defaultFoods.js';
import { DEFAULT_SETTINGS } from './data/constants.js';
import {
  generatePlan, regenerateMeal, regenerateSlot, clonePlanForToday, todayStr,
} from './engine/generator.js';

const KEYS = {
  foods: 'mp.foods.v1',
  history: 'mp.history.v1',
  settings: 'mp.settings.v1',
  current: 'mp.current.v1',
};
const MAX_HISTORY = 200;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked – app keeps working in memory */
  }
}

const freshDefaults = () => DEFAULT_FOODS.map((f) => ({ ...f, ingredients: [...f.ingredients] }));

function load() {
  const savedFoods = read(KEYS.foods, null);
  const foods = Array.isArray(savedFoods) && savedFoods.length ? savedFoods : freshDefaults();
  const settings = { ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) };
  settings.last = { ...DEFAULT_SETTINGS.last, ...(settings.last || {}) };
  const history = read(KEYS.history, []);
  const currentId = read(KEYS.current, null);
  return {
    foods: foods.map((f) => ({ ekadashiOnly: false, available: true, ...f })),
    history: Array.isArray(history) ? history : [],
    settings,
    currentId,
    revision: 0,
  };
}

export function useAppState() {
  const [app, setApp] = useState(load);
  const ref = useRef(app);
  ref.current = app;

  const commit = useCallback((patch) => {
    const next = { ...ref.current, ...(typeof patch === 'function' ? patch(ref.current) : patch) };
    ref.current = next;
    setApp(next);
    return next;
  }, []);

  useEffect(() => write(KEYS.foods, app.foods), [app.foods]);
  useEffect(() => write(KEYS.history, app.history), [app.history]);
  useEffect(() => write(KEYS.settings, app.settings), [app.settings]);
  useEffect(() => write(KEYS.current, app.currentId), [app.currentId]);

  const current = app.history.find((h) => h.id === app.currentId) || null;

  const upsertPlan = (plan, { bump = true } = {}) =>
    commit((s) => {
      const rest = s.history.filter((h) => h.id !== plan.id);
      const history = [plan, ...rest].sort((a, b) => (b.date === a.date ? b.createdAt - a.createdAt : b.date < a.date ? -1 : 1));
      return { history: history.slice(0, MAX_HISTORY), currentId: plan.id, revision: bump ? s.revision + 1 : s.revision };
    });

  const actions = {
    /** Generate a brand-new plan. */
    generate(category, options) {
      const s = ref.current;
      const cur = s.history.find((h) => h.id === s.currentId);
      const replaceId =
        cur && cur.date === todayStr() && !cur.saved && !cur.cooked.breakfast && !cur.cooked.lunch ? cur.id : undefined;
      const plan = generatePlan(s.foods, category, options, s.settings, s.history, { replaceId });
      commit((st) => ({ settings: { ...st.settings, last: { ...st.settings.last, category, ...options } } }));
      upsertPlan(plan);
      return plan;
    },
    regenerateAll() {
      const s = ref.current;
      const cur = s.history.find((h) => h.id === s.currentId);
      if (!cur) return null;
      const plan = generatePlan(s.foods, cur.category, cur.options, s.settings, s.history, { replaceId: cur.id });
      plan.saved = cur.saved;
      plan.date = cur.date;
      upsertPlan(plan);
      return plan;
    },
    regenerateMeal(meal) {
      const s = ref.current;
      const cur = s.history.find((h) => h.id === s.currentId);
      if (!cur) return;
      upsertPlan(regenerateMeal(cur, meal, s.foods, s.settings, s.history));
    },
    regenerateSlot(meal, slotId) {
      const s = ref.current;
      const cur = s.history.find((h) => h.id === s.currentId);
      if (!cur) return { ok: false, message: 'No plan yet.' };
      const res = regenerateSlot(cur, meal, slotId, s.foods, s.settings, s.history);
      if (res.ok) upsertPlan(res.plan, { bump: !!res.rebuilt });
      return res;
    },
    toggleCooked(id, meal) {
      commit((s) => ({
        history: s.history.map((h) => {
          if (h.id !== id) return h;
          const meals = meal === 'both' ? ['breakfast', 'lunch'] : [meal];
          const allOn = meals.every((m) => h.cooked[m]);
          const cooked = { ...h.cooked };
          meals.forEach((m) => (cooked[m] = !allOn));
          return { ...h, cooked };
        }),
      }));
    },
    toggleSaved(id) {
      commit((s) => ({ history: s.history.map((h) => (h.id === id ? { ...h, saved: !h.saved } : h)) }));
    },
    deletePlan(id) {
      commit((s) => ({
        history: s.history.filter((h) => h.id !== id),
        currentId: s.currentId === id ? null : s.currentId,
      }));
    },
    reusePlan(id) {
      const old = ref.current.history.find((h) => h.id === id);
      if (!old) return null;
      const plan = clonePlanForToday(old);
      upsertPlan(plan);
      return plan;
    },
    openPlan(id) {
      commit({ currentId: id });
    },
    resetHistory() {
      commit({ history: [], currentId: null });
    },

    // foods
    addFood(food) {
      commit((s) => ({ foods: [...s.foods, food] }));
    },
    updateFood(food) {
      commit((s) => ({ foods: s.foods.map((f) => (f.id === food.id ? food : f)) }));
    },
    deleteFood(id) {
      commit((s) => ({ foods: s.foods.filter((f) => f.id !== id) }));
    },
    setAvailable(id, available) {
      commit((s) => ({ foods: s.foods.map((f) => (f.id === id ? { ...f, available } : f)) }));
    },
    restoreMissingDefaults() {
      let added = 0;
      commit((s) => {
        const have = new Set(s.foods.map((f) => f.id));
        const missing = freshDefaults().filter((f) => !have.has(f.id));
        added = missing.length;
        return { foods: [...s.foods, ...missing] };
      });
      return added;
    },
    resetFoods() {
      commit({ foods: freshDefaults() });
    },

    // settings
    updateSettings(patch) {
      commit((s) => ({ settings: { ...s.settings, ...patch } }));
    },
    setLast(patch) {
      commit((s) => ({ settings: { ...s.settings, last: { ...s.settings.last, ...patch } } }));
    },
    setEkadashiAllowed(id, allowed) {
      commit((s) => {
        const set = new Set(s.settings.ekadashiBlocked);
        if (allowed) set.delete(id);
        else set.add(id);
        return { settings: { ...s.settings, ekadashiBlocked: [...set] } };
      });
    },
  };

  return { app, current, actions };
}
