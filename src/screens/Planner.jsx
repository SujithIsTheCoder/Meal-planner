import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, INGREDIENT_LABEL, PROTEINS } from '../data/constants.js';
import { blockedSet } from '../engine/generator.js';
import PlanView from '../components/PlanView.jsx';
import { Button, Card, Chip } from '../components/ui.jsx';

export function CategoryCard({ cat, active, onClick, size = 'lg' }) {
  return (
    <button className={`cat-card cat-${cat.color} cat-${size} ${active ? 'cat-active' : ''}`} onClick={onClick} aria-pressed={active}>
      <span className="cat-emoji" aria-hidden="true">{cat.emoji}</span>
      <span className="cat-name">{cat.label}</span>
      <span className="cat-tag">{cat.tagline}</span>
      {active && <span className="cat-check" aria-hidden="true">✓</span>}
    </button>
  );
}

export function LoadingPot({ text = 'Finding something tasty…' }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <div className="pot" aria-hidden="true">
        <span className="steam s1" /><span className="steam s2" /><span className="steam s3" />
        <span className="pot-emoji">🍲</span>
      </div>
      <p>{text}</p>
    </div>
  );
}

export default function Planner({ app, current, actions, autoGen, consumeAutoGen, go }) {
  const { last } = app.settings;
  const [loading, setLoading] = useState(false);
  const planRef = useRef(null);
  const timer = useRef(null);

  const generate = () => {
    if (loading) return;
    setLoading(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      actions.generate(last.category, { staple: last.staple, protein: last.protein, nvStaple: last.nvStaple });
      setLoading(false);
      setTimeout(() => planRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }, 1100);
  };

  useEffect(() => {
    if (autoGen) {
      consumeAutoGen();
      generate();
    }
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const blocked = blockedSet(app.settings);
  const notUsed = [...blocked].map((id) => INGREDIENT_LABEL[id]?.toLowerCase()).filter(Boolean);

  return (
    <div className="screen">
      <h1 className="screen-title">Meal Planner</h1>

      <Card>
        <h2 className="step-title"><span className="step-num">1</span> What kind of food today?</h2>
        <div className="cat-grid">
          {CATEGORIES.map((c) => (
            <CategoryCard key={c.id} cat={c} active={last.category === c.id} onClick={() => actions.setLast({ category: c.id })} />
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="step-title"><span className="step-num">2</span> Your choices</h2>

        {last.category === 'veg' && (
          <>
            <p className="muted">Which staple for lunch?</p>
            <div className="chip-row big">
              {[['rice', '🍚 Rice'], ['roti', '🫓 Roti / Chapati'], ['both', '🍚🫓 Both']].map(([id, label]) => (
                <Chip key={id} active={last.staple === id} onClick={() => actions.setLast({ staple: id })}>{label}</Chip>
              ))}
            </div>
          </>
        )}

        {last.category === 'nonveg' && (
          <>
            <p className="muted">Which non-veg item?</p>
            <div className="chip-row big">
              {PROTEINS.map((p) => (
                <Chip key={p.id} active={last.protein === p.id} onClick={() => actions.setLast({ protein: p.id })}>{p.emoji} {p.label}</Chip>
              ))}
            </div>
            <p className="muted mt">Eat it with:</p>
            <div className="chip-row big">
              {[['rice', '🍚 Rice'], ['roti', '🫓 Chapati'], ['any', 'Either']].map(([id, label]) => (
                <Chip key={id} active={last.nvStaple === id} onClick={() => actions.setLast({ nvStaple: id })}>{label}</Chip>
              ))}
            </div>
          </>
        )}

        {last.category === 'ekadashi' && (
          <div className="notice notice-info">
            🪔 Only Ekadashi-friendly dishes are used. <strong>Not used:</strong> {notUsed.join(', ')}.{' '}
            <button className="link" onClick={() => go('settings')}>Change restrictions</button>
          </div>
        )}

        <Button variant="primary" size="xl" className="gen-btn" icon="✨" onClick={generate} disabled={loading}>
          GENERATE MEAL PLAN
        </Button>
      </Card>

      <div ref={planRef} className="plan-anchor">
        {loading && <LoadingPot />}
        {!loading && current && <PlanView plan={current} actions={actions} key={`${current.id}-${app.revision}`} />}
        {!loading && !current && (
          <div className="empty">
            <div className="empty-emoji">🍛</div>
            <p>Your meal plan will appear here.</p>
            <p className="muted">Choose a category and press the big button.</p>
          </div>
        )}
      </div>
    </div>
  );
}
