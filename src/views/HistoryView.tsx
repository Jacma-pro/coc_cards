import { useEffect, useMemo, useState } from 'react';
import type { CategoryFilterValue } from '../App';
import type { AppData } from '../lib/useAppData';
import type { Account, Card, CardEvent } from '../lib/types';
import { fetchEvents } from '../lib/api';
import { supabase } from '../lib/supabase';
import { categoryMeta } from '../lib/categories';
import { HistoryIcon, TradeIcon } from '../components/icons';

interface Props {
  data: AppData;
  category: CategoryFilterValue;
  accountId: string;
  accountName: string;
}

type Entry =
  | { kind: 'single'; key: string; at: string; ev: CardEvent }
  | {
      kind: 'trade';
      key: string;
      at: string;
      partnerId: string | null;
      given: CardEvent | null;
      received: CardEvent | null;
    };

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, today)) return "Aujourd'hui";
  if (sameDay(d, yesterday)) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function HistoryView({ data, category, accountId, accountName }: Props) {
  const [events, setEvents] = useState<CardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const cardById = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of data.cards) m.set(c.id, c);
    return m;
  }, [data.cards]);

  const accById = useMemo(() => {
    const m = new Map<string, Account>();
    for (const a of data.accounts) m.set(a.id, a);
    return m;
  }, [data.accounts]);

  // Chargement initial + rechargement au changement de compte.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    fetchEvents(accountId)
      .then((ev) => {
        if (alive) setEvents(ev);
      })
      .catch((e) => {
        if (alive) setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [accountId]);

  // Temps réel : ajoute les nouveaux mouvements de ce compte en tête de liste.
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel(`card_events-${accountId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'card_events',
          filter: `account_id=eq.${accountId}`,
        },
        (payload) => {
          const ev = payload.new as CardEvent;
          setEvents((prev) => (prev.some((e) => e.id === ev.id) ? prev : [ev, ...prev]));
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [accountId]);

  const visible = useMemo(() => {
    if (category === 'all') return events;
    return events.filter((e) => cardById.get(e.card_id)?.category === category);
  }, [events, category, cardById]);

  // Regroupe les mouvements d'un même échange en une seule entrée.
  const entries = useMemo(() => {
    const out: Entry[] = [];
    const tradeIndex = new Map<string, number>();
    for (const ev of visible) {
      if (ev.reason === 'trade' && ev.trade_id) {
        let idx = tradeIndex.get(ev.trade_id);
        if (idx === undefined) {
          idx = out.length;
          tradeIndex.set(ev.trade_id, idx);
          out.push({
            kind: 'trade',
            key: ev.trade_id,
            at: ev.created_at,
            partnerId: ev.partner_id,
            given: null,
            received: null,
          });
        }
        const entry = out[idx] as Extract<Entry, { kind: 'trade' }>;
        if (ev.delta < 0) entry.given = ev;
        else entry.received = ev;
      } else {
        out.push({ kind: 'single', key: ev.id, at: ev.created_at, ev });
      }
    }
    return out;
  }, [visible]);

  // Découpe en sections par jour.
  const sections = useMemo(() => {
    const secs: { key: string; label: string; items: Entry[] }[] = [];
    let cur: (typeof secs)[number] | null = null;
    for (const e of entries) {
      const k = dayKey(e.at);
      if (!cur || cur.key !== k) {
        cur = { key: k, label: dayLabel(e.at), items: [] };
        secs.push(cur);
      }
      cur.items.push(e);
    }
    return secs;
  }, [entries]);

  if (loading) {
    return (
      <div className="loading">
        <span className="loading__spinner" aria-hidden />
        <p className="muted">Chargement de l'historique…</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="empty">
        <HistoryIcon size={40} className="empty__icon" />
        <p>Impossible de charger l'historique.</p>
        <p className="muted">{err}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="empty">
        <HistoryIcon size={40} className="empty__icon" />
        <p>Aucune activité pour l'instant.</p>
        <p className="muted">
          Les ajouts, retraits et échanges de <strong>{accountName}</strong> apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="history">
      {sections.map((sec) => (
        <section key={sec.key} className="history__section">
          <h2 className="history__day">{sec.label}</h2>
          <div className="history__items">
            {sec.items.map((e) =>
              e.kind === 'single' ? (
                <SingleRow key={e.key} ev={e.ev} card={cardById.get(e.ev.card_id)} />
              ) : (
                <TradeRow
                  key={e.key}
                  at={e.at}
                  partner={e.partnerId ? accById.get(e.partnerId) : undefined}
                  given={e.given ? cardById.get(e.given.card_id) : undefined}
                  received={e.received ? cardById.get(e.received.card_id) : undefined}
                />
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function Thumb({ card }: { card?: Card }) {
  const meta = card ? categoryMeta(card.category) : null;
  return (
    <span
      className="histrow__art"
      style={meta ? ({ '--cat-color': meta.color } as React.CSSProperties) : undefined}
    >
      {card?.imageUrl ? (
        <img src={card.imageUrl} alt="" loading="lazy" />
      ) : (
        <span className="histrow__ph" aria-hidden>
          {card?.name.charAt(0) ?? '?'}
        </span>
      )}
    </span>
  );
}

function SingleRow({ ev, card }: { ev: CardEvent; card?: Card }) {
  const added = ev.delta > 0;
  return (
    <div className="histrow">
      <Thumb card={card} />
      <div className="histrow__body">
        <span className="histrow__title">{card?.name ?? ev.card_id}</span>
        <span className="histrow__sub muted">{added ? 'Ajoutée' : 'Retirée'}</span>
      </div>
      <span className={`histrow__delta ${added ? 'is-plus' : 'is-minus'}`}>
        {added ? `+${ev.delta}` : `${ev.delta}`}
      </span>
      <span className="histrow__time muted">{timeLabel(ev.created_at)}</span>
    </div>
  );
}

function TradeRow({
  at,
  partner,
  given,
  received,
}: {
  at: string;
  partner?: Account;
  given?: Card;
  received?: Card;
}) {
  return (
    <div className="histrow histrow--trade">
      <span className="histrow__tradeicon" aria-hidden>
        <TradeIcon size={18} />
      </span>
      <div className="histrow__body">
        <span className="histrow__title">Échange avec {partner?.name ?? '?'}</span>
        <span className="histrow__sub">
          {received && (
            <>
              <span className="histrow__tag is-plus">reçu {received.name}</span>{' '}
            </>
          )}
          {given && <span className="histrow__tag is-minus">donné {given.name}</span>}
        </span>
      </div>
      <span className="histrow__time muted">{timeLabel(at)}</span>
    </div>
  );
}
