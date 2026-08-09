import { useEffect, useMemo, useState } from 'react';
import type { CategoryFilterValue } from '../App';
import { CardTile } from '../components/CardTile';
import { CATEGORIES } from '../lib/categories';
import type { AppData } from '../lib/useAppData';
import { ownKey } from '../lib/types';
import { initials, ownerColor } from '../lib/owners';

interface Props {
  data: AppData;
  category: CategoryFilterValue;
}

export function AlbumView({ data, category }: Props) {
  const { cards, accounts, ownership, setQuantity } = data;
  const [accountId, setAccountId] = useState<string>('');

  const owners = useMemo(() => [...new Set(accounts.map((a) => a.owner))], [accounts]);

  useEffect(() => {
    if (!accountId && accounts.length > 0) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const visibleCategories = useMemo(
    () => CATEGORIES.filter((c) => category === 'all' || c.id === category),
    [category],
  );

  const totalOwned = useMemo(() => {
    if (!accountId) return 0;
    return cards.filter((c) => (ownership[ownKey(accountId, c.id)] ?? 0) >= 1).length;
  }, [cards, ownership, accountId]);

  const pct = cards.length ? Math.round((totalOwned / cards.length) * 100) : 0;

  if (accounts.length === 0) {
    return <p className="empty">Aucun compte. Lance l'import Supabase (npm run import).</p>;
  }

  return (
    <div className="album">
      <div className="accounts" role="tablist" aria-label="Choisir un compte">
        {accounts.map((a) => {
          const color = ownerColor(a.owner, owners);
          const active = a.id === accountId;
          return (
            <button
              key={a.id}
              role="tab"
              aria-selected={active}
              className={`accpill ${active ? 'is-active' : ''}`}
              style={{ '--acc-color': color } as React.CSSProperties}
              onClick={() => setAccountId(a.id)}
              title={`${a.name} — ${a.owner} (priorité ${a.priority})`}
            >
              <span className="accpill__avatar">{initials(a.name)}</span>
              <span className="accpill__meta">
                <span className="accpill__name">{a.name}</span>
                <span className="accpill__owner">{a.owner}</span>
              </span>
            </button>
          );
        })}
      </div>

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
