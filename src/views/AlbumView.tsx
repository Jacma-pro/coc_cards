import { useMemo } from 'react';
import type { CategoryFilterValue } from '../App';
import { CardTile } from '../components/CardTile';
import { CATEGORIES } from '../lib/categories';
import type { AppData } from '../lib/useAppData';
import { ownKey } from '../lib/types';

interface Props {
  data: AppData;
  category: CategoryFilterValue;
  accountId: string;
}

export function AlbumView({ data, category, accountId }: Props) {
  const { cards, ownership, setQuantity } = data;

  const visibleCategories = useMemo(
    () => CATEGORIES.filter((c) => category === 'all' || c.id === category),
    [category],
  );

  const totalOwned = useMemo(
    () => cards.filter((c) => (ownership[ownKey(accountId, c.id)] ?? 0) >= 1).length,
    [cards, ownership, accountId],
  );

  const pct = cards.length ? Math.round((totalOwned / cards.length) * 100) : 0;

  return (
    <div className="album">
      <div className="album__progress">
        <div className="album__progresshead">
          <span className="album__pctnum">{pct}%</span>
          <span className="muted">
            {totalOwned} / {cards.length} cartes
          </span>
        </div>
        <div className="progressbar" aria-hidden>
          <span className="progressbar__fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {visibleCategories.map((cat) => {
        const catCards = cards.filter((c) => c.category === cat.id);
        if (catCards.length === 0) return null;
        const owned = catCards.filter((c) => (ownership[ownKey(accountId, c.id)] ?? 0) >= 1).length;
        const cpct = Math.round((owned / catCards.length) * 100);
        return (
          <section key={cat.id} className="catgroup">
            <div className="catgroup__head" style={{ '--cat-color': cat.color } as React.CSSProperties}>
              <span className="catgroup__dot" aria-hidden />
              <h2 className="catgroup__title">{cat.label}</h2>
              <span className="catgroup__count">
                {owned}<span className="muted">/{catCards.length}</span>
              </span>
            </div>
            <div className="progressbar progressbar--thin" aria-hidden>
              <span
                className="progressbar__fill"
                style={{ width: `${cpct}%`, background: cat.color }}
              />
            </div>
            <div className="grid">
              {catCards.map((card) => (
                <CardTile
                  key={card.id}
                  card={card}
                  quantity={ownership[ownKey(accountId, card.id)] ?? 0}
                  onChange={(q) => setQuantity(accountId, card.id, q)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
