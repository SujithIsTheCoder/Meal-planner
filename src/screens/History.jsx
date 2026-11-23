import { useMemo, useState } from 'react';
import { CATEGORIES } from '../data/constants.js';
import { daysBetween, todayStr } from '../engine/generator.js';
import { DishRow } from '../components/MealCard.jsx';
import { planSubtitle } from '../components/PlanView.jsx';
import { Badge, Button, Chip, formatDate, useNotify } from '../components/ui.jsx';

export default function History({ app, actions, go }) {
  const notify = useNotify();
  const [filter, setFilter] = useState('week');
  const [open, setOpen] = useState(() => new Set());
  const today = todayStr();

  const list = useMemo(() => {
    return app.history.filter((h) => {
      if (filter === 'week') return daysBetween(h.date, today) <= 6;
      if (filter === 'saved') return h.saved;
      if (filter === 'cooked') return h.cooked.breakfast || h.cooked.lunch;
      return true;
    });
  }, [app.history, filter, today]);

  const toggleOpen = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const reuse = (h) => {
    actions.reusePlan(h.id);
    notify.show('Plan copied to today');
    go('planner');
  };
  const remove = async (h) => {
    const ok = await notify.confirm({ title: 'Remove this plan?', message: `The plan for ${formatDate(h.date)} will be deleted from history.`, confirmLabel: 'Yes, remove', danger: true });
    if (ok) actions.deletePlan(h.id);
  };

  return (
    <div className="screen">
      <h1 className="screen-title">History</h1>
      <p className="muted">Every plan is remembered here. The planner avoids dishes you had in the last {app.settings.avoidDays} days.</p>
      <div className="chip-row">
        {[['week', 'Last 7 days'], ['saved', '★ Saved'], ['cooked', '🍳 Cooked'], ['all', 'Everything']].map(([id, l]) => (
          <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>{l}</Chip>
        ))}
      </div>

      {!list.length && (
        <div className="empty"><div className="empty-emoji">📖</div><p>Nothing here yet.</p><p className="muted">Generated meal plans will show up in this list.</p></div>
      )}

      <ul className="history-list">
        {list.map((h) => {
          const { cat, extra } = planSubtitle(h);
          const isOpen = open.has(h.id);
          return (
            <li key={h.id} className="hist-card">
              <div className="hist-top">
                <div>
                  <div className="hist-date">{formatDate(h.date, { weekday: 'long', day: 'numeric', month: 'short' })}{h.date === today && <Badge tone="green">Today</Badge>}</div>
                  <div className="food-badges">
                    <Badge tone={cat?.color}>{cat?.emoji} {cat?.label}</Badge>
                    {extra && <Badge tone="neutral">{extra}</Badge>}
                    {h.saved && <Badge tone="saffron">★ Saved</Badge>}
                    {h.cooked.breakfast && <Badge tone="green">✓ Breakfast cooked</Badge>}
                    {h.cooked.lunch && <Badge tone="green">✓ Lunch cooked</Badge>}
                  </div>
                </div>
              </div>
              <p className="hist-line"><strong>🌅 </strong>{h.breakfast.slots.map((s) => s.foodName).join(' · ') || '—'}</p>
              <p className="hist-line"><strong>☀️ </strong>{h.lunch.slots.map((s) => s.foodName).join(' · ') || '—'}</p>

              {isOpen && (
                <div className="hist-detail quick-grid">
                  <ul className="dish-list compact">{h.breakfast.slots.map((s) => <DishRow key={s.id} slot={s} />)}</ul>
                  <ul className="dish-list compact">{h.lunch.slots.map((s) => <DishRow key={s.id} slot={s} />)}</ul>
                </div>
              )}

              <div className="hist-actions">
                <Button variant="ghost" size="sm" onClick={() => toggleOpen(h.id)}>{isOpen ? 'Hide details' : 'View'}</Button>
                <Button variant="soft" size="sm" icon="↺" onClick={() => reuse(h)}>Reuse</Button>
                <Button variant={h.cooked.breakfast && h.cooked.lunch ? 'green' : 'ghost'} size="sm" icon="🍳" onClick={() => actions.toggleCooked(h.id, 'both')}>
                  {h.cooked.breakfast && h.cooked.lunch ? 'Cooked ✓' : 'Mark cooked'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => actions.toggleSaved(h.id)}>{h.saved ? '★ Unsave' : '☆ Save'}</Button>
                <Button variant="ghost" size="sm" onClick={() => remove(h)} aria-label="Delete plan">🗑️</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
