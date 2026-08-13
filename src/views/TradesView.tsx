import { useMemo, useState } from 'react';
import type { CategoryFilterValue } from '../App';
import { categoryMeta } from '../lib/categories';
import type { AppData } from '../lib/useAppData';
import type { Account } from '../lib/types';
import {
  directionalTradesFor,
  quantityOf,
  reciprocalMatrix,
  reciprocalTradesFor,
  type CategorySwap,
  type PartnerTrades,
} from '../lib/trades';
import { ListIcon, GridIcon, TradeIcon, PlusIcon } from '../components/icons';

interface Props {
  data: AppData;
  category: CategoryFilterValue;
  accountId: string;
  accountName: string;
}

type SubTab = 'list' | 'give' | 'matrix';

export function TradesView({ data, category, accountId, accountName }: Props) {
  const { cards, accounts, ownership } = data;
  const [sub, setSub] = useState<SubTab>('list');

  const isPrincipal = useMemo(
    () => accounts.find((a) => a.id === accountId)?.priority === 1,
    [accounts, accountId],
  );

  const filteredCards = useMemo(
    () => (category === 'all' ? cards : cards.filter((c) => c.category === category)),
    [cards, category],
  );

  const partners = useMemo(
    () => reciprocalTradesFor(filteredCards, accounts, ownership, accountId),
    [filteredCards, accounts, ownership, accountId],
  );

  const givePartners = useMemo(
    () => directionalTradesFor(filteredCards, accounts, ownership, accountId),
    [filteredCards, accounts, ownership, accountId],
  );

  const matrix = useMemo(
    () => reciprocalMatrix(filteredCards, accounts, ownership),
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
          Échanges
        </button>
        <button
          role="tab"
          aria-selected={sub === 'give'}
          className={`subtabs__btn ${sub === 'give' ? 'is-active' : ''}`}
          onClick={() => setSub('give')}
        >
          <PlusIcon size={18} />
          Compléter
        </button>
        <button
          role="tab"
          aria-selected={sub === 'matrix'}
          className={`subtabs__btn ${sub === 'matrix' ? 'is-active' : ''}`}
          onClick={() => setSub('matrix')}
        >
          <GridIcon size={18} />
          Vue
        </button>
      </div>

      {sub === 'list' && (
        <>
          <p className="trades__intro muted">
            Échanges gagnant-gagnant pour <strong>{accountName}</strong> : tu donnes un doublon, tu
            reçois une carte qui te manque (même catégorie).
          </p>
          <TradeList partners={partners} meId={accountId} meName={accountName} data={data} />
        </>
      )}

      {sub === 'give' &&
        (isPrincipal ? (
          <>
            <p className="trades__intro muted">
              Compléter <strong>{accountName}</strong> à sens unique : tu récupères une carte qui te
              manque et tu rends en échange un doublon que l'autre compte possède déjà (il ne perd
              rien).
            </p>
            <TradeList
              partners={givePartners}
              meId={accountId}
              meName={accountName}
              data={data}
              emptyHint="Il faut qu'un autre compte ait un doublon d'une carte qui te manque, et que toi tu aies un doublon d'une carte qu'il possède déjà (même catégorie) à lui rendre."
            />
          </>
        ) : (
          <div className="empty">
            <PlusIcon size={40} className="empty__icon" />
            <p>Réservé aux comptes principaux pour l'instant.</p>
            <p className="muted">
              Sélectionne un compte principal (main) pour voir les cartes à récupérer sur tes autres
              comptes.
            </p>
          </div>
        ))}

      {sub === 'matrix' && (
        <TradeMatrix accounts={accounts} matrix={matrix} highlightId={accountId} />
      )}
    </div>
  );
}

function TradeList({
  partners,
  meId,
  meName,
  data,
  emptyHint,
}: {
  partners: PartnerTrades[];
  meId: string;
  meName: string;
  data: AppData;
  emptyHint?: string;
}) {
  if (partners.length === 0) {
    return (
      <div className="empty">
        <TradeIcon size={40} className="empty__icon" />
        <p>Aucun échange possible pour l'instant.</p>
        <p className="muted">
          {emptyHint ??
            "Il faut qu'un autre compte ait un doublon d'une carte qui te manque, et toi un doublon d'une carte qui lui manque, dans la même catégorie."}
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
            {swaps.map((sw) => (
              <SwapCard
                key={sw.category}
                swap={sw}
                partner={partner}
                meId={meId}
                meName={meName}
                data={data}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SwapCard({
  swap,
  partner,
  meId,
  meName,
  data,
}: {
  swap: CategorySwap;
  partner: Account;
  meId: string;
  meName: string;
  data: AppData;
}) {
  const { ownership, setQuantity } = data;
  const meta = categoryMeta(swap.category);
  const [giveId, setGiveId] = useState('');
  const [getId, setGetId] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Sélection effective (auto si un seul choix, sinon celle de l'utilisateur si encore valide).
  const effGive = swap.give.some((c) => c.id === giveId)
    ? giveId
    : swap.give.length === 1
      ? swap.give[0].id
      : '';
  const effGet = swap.get.some((c) => c.id === getId)
    ? getId
    : swap.get.length === 1
      ? swap.get[0].id
      : '';
  const ready = Boolean(effGive && effGet);

  const giveCard = swap.give.find((c) => c.id === effGive);
  const getCard = swap.get.find((c) => c.id === effGet);

  const apply = () => {
    if (!effGive || !effGet) return;
    const tradeId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const mine = { reason: 'trade' as const, tradeId, partnerId: partner.id };
    const theirs = { reason: 'trade' as const, tradeId, partnerId: meId };
    // Moi : je donne effGive (-1), je reçois effGet (+1)
    setQuantity(meId, effGive, quantityOf(ownership, meId, effGive) - 1, mine);
    setQuantity(meId, effGet, quantityOf(ownership, meId, effGet) + 1, mine);
    // Partenaire : il reçoit effGive (+1), il donne effGet (-1)
    setQuantity(partner.id, effGive, quantityOf(ownership, partner.id, effGive) + 1, theirs);
    setQuantity(partner.id, effGet, quantityOf(ownership, partner.id, effGet) - 1, theirs);
    setConfirming(false);
    setGiveId('');
    setGetId('');
  };

  return (
    <div className="swap" style={{ '--cat-color': meta.color } as React.CSSProperties}>
      <span className="swap__cat">
        <span className="swap__catdot" aria-hidden />
        {meta.label}
      </span>

      <div className="swap__cols">
        <div className="swap__col swap__col--give">
          <span className="swap__label">Tu donnes</span>
          <div className="swap__opts">
            {swap.give.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`swap__opt ${effGive === c.id ? 'is-sel' : ''}`}
                aria-pressed={effGive === c.id}
                onClick={() => {
                  setGiveId(c.id);
                  setConfirming(false);
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <span className="swap__arrow" aria-hidden>
          ⇄
        </span>

        <div className="swap__col swap__col--get">
          <span className="swap__label">Tu reçois</span>
          <div className="swap__opts">
            {swap.get.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`swap__opt ${effGet === c.id ? 'is-sel' : ''}`}
                aria-pressed={effGet === c.id}
                onClick={() => {
                  setGetId(c.id);
                  setConfirming(false);
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!confirming ? (
        <button
          type="button"
          className="swap__validate"
          disabled={!ready}
          onClick={() => setConfirming(true)}
        >
          Valider l'échange
        </button>
      ) : (
        <div className="swap__confirm" role="alertdialog" aria-label="Confirmer l'échange">
          <p className="swap__confirmtxt">
            <strong>{meName}</strong> donne <strong>{giveCard?.name}</strong> et reçoit{' '}
            <strong>{getCard?.name}</strong> de <strong>{partner.name}</strong>. Les deux classeurs
            seront mis à jour.
          </p>
          <div className="swap__confirmbtns">
            <button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)}>
              Annuler
            </button>
            <button type="button" className="btn" onClick={apply}>
              Confirmer
            </button>
          </div>
        </div>
      )}
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
