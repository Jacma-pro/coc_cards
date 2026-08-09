import { useMemo, useState } from 'react';
import type { CategoryFilterValue } from '../App';
import { categoryMeta } from '../lib/categories';
import type { AppData } from '../lib/useAppData';
import type { Account } from '../lib/types';
import { computeMatrix, computeTrades, type TradeOpportunity } from '../lib/trades';
import { ListIcon, GridIcon, TradeIcon } from '../components/icons';

interface Props {
  data: AppData;
  category: CategoryFilterValue;
}

type SubTab = 'list' | 'matrix';

export function TradesView({ data, category }: Props) {
  const { cards, accounts, ownership } = data;
  const [sub, setSub] = useState<SubTab>('list');

  const filteredCards = useMemo(
    () => (category === 'all' ? cards : cards.filter((c) => c.category === category)),
    [cards, category],
  );

  const trades = useMemo(
    () => computeTrades(filteredCards, accounts, ownership),
    [filteredCards, accounts, ownership],
  );

  const matrix = useMemo(
    () => computeMatrix(filteredCards, accounts, ownership),
    [filteredCards, accounts, ownership],
  );

  return (
    <div className="trades">
      <div className="subtabs" role="tablist" aria-label="Vue des échanges">
        <button
          role="tab"
          aria-selected={sub === 'list'}
          className={`subtabs__btn ${sub === 'list' ? 'is-active' : ''}`}
          onClick={() => setSub('list')}
        >
          <ListIcon size={18} />
          Liste
        </button>
        <button
          role="tab"
          aria-selected={sub === 'matrix'}
          className={`subtabs__btn ${sub === 'matrix' ? 'is-active' : ''}`}
          onClick={() => setSub('matrix')}
        >
          <GridIcon size={18} />
          Matrice
        </button>
      </div>

      {sub === 'list' ? (
        <TradeList trades={trades} accounts={accounts} />
      ) : (
        <TradeMatrix accounts={accounts} matrix={matrix} />
      )}
    </div>
  );
}

function TradeList({ trades, accounts }: { trades: TradeOpportunity[]; accounts: Account[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, TradeOpportunity[]>();
    for (const t of trades) {
      const arr = map.get(t.receiver.id);
      if (arr) arr.push(t);
      else map.set(t.receiver.id, [t]);
    }
    return [...map.entries()].map(([id, items]) => ({
      receiver: accounts.find((a) => a.id === id)!,
      items,
    }));
  }, [trades, accounts]);

  if (trades.length === 0) {
    return (
      <div className="empty">
        <TradeIcon size={40} className="empty__icon" />
        <p>Aucun échange possible pour l'instant.</p>
        <p className="muted">Renseigne des doublons dans l'album pour voir apparaître les échanges.</p>
      </div>
    );
  }

  return (
    <div className="tradelist">
      {groups.map(({ receiver, items }) => (
        <section key={receiver.id} className="tradegroup">
          <header className="tradegroup__head">
            <h2 className="tradegroup__title">{receiver.name}</h2>
            <span className="tradegroup__owner muted">
              {receiver.owner} · P{receiver.priority}
            </span>
            <span className="tradegroup__badge">{items.length}</span>
          </header>
          <ul className="tradegroup__list">
            {items.map((t) => {
              const meta = categoryMeta(t.card.category);
              return (
                <li
                  key={t.card.id}
                  className="traderow"
                  style={{ '--cat-color': meta.color } as React.CSSProperties}
                >
                  <span className="traderow__card">{t.card.name}</span>
                  <span className="traderow__donors">
                    {t.donors.map((d, i) => (
                      <span key={d.donor.id} className="donor">
                        {i > 0 && <span className="donor__sep" aria-hidden />}
                        {d.donor.name}
                        {d.spare > 1 && <span className="donor__spare">×{d.spare}</span>}
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TradeMatrix({ accounts, matrix }: { accounts: Account[]; matrix: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(matrix));
  return (
    <div className="matrixwrap">
      <p className="matrix-legend muted">
        Ligne <strong>donne</strong> à la colonne · valeur = cartes transmissibles
      </p>
      <div className="matrix-scroll">
        <table className="matrix">
          <thead>
            <tr>
              <th className="matrix__corner">↓ donne / reçoit →</th>
              {accounts.map((a) => (
                <th key={a.id} className="matrix__colhead" title={`${a.name} — ${a.owner}`}>
                  {a.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.map((donor) => (
              <tr key={donor.id}>
                <th className="matrix__rowhead" title={`${donor.name} — ${donor.owner}`}>
                  {donor.name}
                </th>
                {accounts.map((receiver) => {
                  if (donor.id === receiver.id) {
                    return <td key={receiver.id} className="matrix__self" aria-hidden />;
                  }
                  const n = matrix[`${donor.id}:${receiver.id}`] ?? 0;
                  const intensity = n === 0 ? 0 : 0.18 + 0.6 * (n / max);
                  return (
                    <td
                      key={receiver.id}
                      className={`matrix__cell ${n > 0 ? 'has' : ''}`}
                      style={{
                        background: n > 0 ? `rgba(124, 58, 237, ${intensity})` : undefined,
                      }}
                      title={`${donor.name} → ${receiver.name} : ${n} carte(s)`}
                    >
                      {n > 0 ? n : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
