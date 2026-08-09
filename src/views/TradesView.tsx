import { useMemo, useState } from 'react';
import type { CategoryFilterValue } from '../App';
import { categoryMeta } from '../lib/categories';
import type { AppData } from '../lib/useAppData';
import type { Account } from '../lib/types';
import { reciprocalMatrix, reciprocalTradesFor, type PartnerTrades } from '../lib/trades';
import { ListIcon, GridIcon, TradeIcon } from '../components/icons';

interface Props {
  data: AppData;
  category: CategoryFilterValue;
  accountId: string;
  accountName: string;
}

type SubTab = 'list' | 'matrix';

export function TradesView({ data, category, accountId, accountName }: Props) {
  const { cards, accounts, ownership } = data;
  const [sub, setSub] = useState<SubTab>('list');

  const filteredCards = useMemo(
    () => (category === 'all' ? cards : cards.filter((c) => c.category === category)),
    [cards, category],
  );

  const partners = useMemo(
    () => reciprocalTradesFor(filteredCards, accounts, ownership, accountId),
    [filteredCards, accounts, ownership, accountId],
  );

  const matrix = useMemo(
    () => reciprocalMatrix(filteredCards, accounts, ownership),
    [filteredCards, accounts, ownership],
  );

  return (
    <div className="trades">
      <p className="trades__intro muted">
        Échanges gagnant-gagnant pour <strong>{accountName}</strong> : tu donnes un doublon, tu
        reçois une carte qui te manque (même catégorie).
      </p>

      <div className="subtabs" role="tablist" aria-label="Vue des échanges">
        <button
          role="tab"
          aria-selected={sub === 'list'}
          className={`subtabs__btn ${sub === 'list' ? 'is-active' : ''}`}
          onClick={() => setSub('list')}
        >
          <ListIcon size={18} />
          Mes échanges
        </button>
        <button
          role="tab"
          aria-selected={sub === 'matrix'}
          className={`subtabs__btn ${sub === 'matrix' ? 'is-active' : ''}`}
          onClick={() => setSub('matrix')}
        >
          <GridIcon size={18} />
          Vue d'ensemble
        </button>
      </div>

      {sub === 'list' ? (
        <TradeList partners={partners} />
      ) : (
        <TradeMatrix accounts={accounts} matrix={matrix} highlightId={accountId} />
      )}
    </div>
  );
}

function TradeList({ partners }: { partners: PartnerTrades[] }) {
  if (partners.length === 0) {
    return (
      <div className="empty">
        <TradeIcon size={40} className="empty__icon" />
        <p>Aucun échange possible pour l'instant.</p>
        <p className="muted">
          Il faut qu'un autre compte ait un doublon d'une carte qui te manque, et toi un doublon
          d'une carte qui lui manque, dans la même catégorie.
        </p>
      </div>
    );
  }

  return (
    <div className="tradelist">
      {partners.map(({ partner, swaps, total }) => (
        <section key={partner.id} className="tradegroup">
          <header className="tradegroup__head">
            <h2 className="tradegroup__title">Avec {partner.name}</h2>
            {partner.priority === 1 && <span className="tradegroup__main">principal</span>}
            <span className="tradegroup__owner muted">{partner.owner}</span>
            <span className="tradegroup__badge" title="Trocs 1-contre-1 possibles">
              {total}
            </span>
          </header>

          <div className="swaps">
            {swaps.map((sw) => {
              const meta = categoryMeta(sw.category);
              return (
                <div
                  key={sw.category}
                  className="swap"
                  style={{ '--cat-color': meta.color } as React.CSSProperties}
                >
                  <span className="swap__cat">
                    <span className="swap__catdot" aria-hidden />
                    {meta.label}
                  </span>
                  <div className="swap__cols">
                    <div className="swap__col swap__col--give">
                      <span className="swap__label">Tu donnes</span>
                      <span className="swap__cards">{sw.give.map((c) => c.name).join(', ')}</span>
                    </div>
                    <span className="swap__arrow" aria-hidden>
                      ⇄
                    </span>
                    <div className="swap__col swap__col--get">
                      <span className="swap__label">Tu reçois</span>
                      <span className="swap__cards">{sw.get.map((c) => c.name).join(', ')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function TradeMatrix({
  accounts,
  matrix,
  highlightId,
}: {
  accounts: Account[];
  matrix: Record<string, number>;
  highlightId: string;
}) {
  const max = Math.max(1, ...Object.values(matrix));
  return (
    <div className="matrixwrap">
      <p className="matrix-legend muted">
        Nombre d'échanges <strong>gagnant-gagnant</strong> possibles entre deux comptes.
      </p>
      <div className="matrix-scroll">
        <table className="matrix">
          <thead>
            <tr>
              <th className="matrix__corner" />
              {accounts.map((a) => (
                <th
                  key={a.id}
                  className={`matrix__colhead ${a.id === highlightId ? 'is-me' : ''}`}
                  title={`${a.name} — ${a.owner}`}
                >
                  {a.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.map((rowAcc) => (
              <tr key={rowAcc.id}>
                <th
                  className={`matrix__rowhead ${rowAcc.id === highlightId ? 'is-me' : ''}`}
                  title={`${rowAcc.name} — ${rowAcc.owner}`}
                >
                  {rowAcc.name}
                </th>
                {accounts.map((colAcc) => {
                  if (rowAcc.id === colAcc.id) {
                    return <td key={colAcc.id} className="matrix__self" aria-hidden />;
                  }
                  const n = matrix[`${rowAcc.id}:${colAcc.id}`] ?? 0;
                  const intensity = n === 0 ? 0 : 0.18 + 0.6 * (n / max);
                  return (
                    <td
                      key={colAcc.id}
                      className={`matrix__cell ${n > 0 ? 'has' : ''}`}
                      style={{ background: n > 0 ? `rgba(124, 58, 237, ${intensity})` : undefined }}
                      title={`${rowAcc.name} ⇄ ${colAcc.name} : ${n} échange(s)`}
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
