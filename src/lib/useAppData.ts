import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAccounts, fetchCards, fetchPlayerCards, logEvents, setPlayerCard } from './api';
import { isSupabaseConfigured, supabase } from './supabase';
import type { Account, Card, EventReason, OwnershipMap, PlayerCard } from './types';
import { ownKey } from './types';

/** Options de journalisation d'un changement de quantité. */
export interface SetQuantityOpts {
  reason?: EventReason; // par défaut déduit du sens : 'add' si +, 'remove' si -
  tradeId?: string; // regroupe les mouvements d'un même échange
  partnerId?: string; // l'autre compte, pour les échanges
}

export interface AppData {
  loading: boolean;
  error: string | null;
  configured: boolean;
  cards: Card[];
  accounts: Account[];
  ownership: OwnershipMap;
  /** Met à jour la quantité possédée (0 = manquante). Optimiste + persistance Supabase + historique. */
  setQuantity: (
    accountId: string,
    cardId: string,
    quantity: number,
    opts?: SetQuantityOpts,
  ) => void;
  reload: () => void;
}

export function useAppData(): AppData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ownership, setOwnership] = useState<OwnershipMap>({});
  // Miroir synchrone de `ownership` pour lire la quantité précédente sans re-render.
  const ownershipRef = useRef<OwnershipMap>({});
  useEffect(() => {
    ownershipRef.current = ownership;
  }, [ownership]);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError(
        "Supabase n'est pas configuré. Renseigne VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans un fichier .env, puis relance le serveur de dev.",
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [c, a, pc] = await Promise.all([fetchCards(), fetchAccounts(), fetchPlayerCards()]);
      const map: OwnershipMap = {};
      for (const row of pc) map[ownKey(row.account_id, row.card_id)] = row.quantity;
      setCards(c);
      setAccounts(a);
      setOwnership(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Synchro temps réel : applique les changements des autres appareils/comptes.
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel('player_cards-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_cards' },
        (payload) => {
          setOwnership((prev) => {
            const next = { ...prev };
            if (payload.eventType === 'DELETE') {
              const row = payload.old as Partial<PlayerCard>;
              if (row.account_id && row.card_id) delete next[ownKey(row.account_id, row.card_id)];
            } else {
              const row = payload.new as PlayerCard;
              if (row.quantity <= 0) delete next[ownKey(row.account_id, row.card_id)];
              else next[ownKey(row.account_id, row.card_id)] = row.quantity;
            }
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  const setQuantity = useCallback(
    (accountId: string, cardId: string, quantity: number, opts?: SetQuantityOpts) => {
      const q = Math.max(0, Math.floor(quantity));
      const key = ownKey(accountId, cardId);
      const prevQ = ownershipRef.current[key] ?? 0;
      const delta = q - prevQ;
      // Maj optimiste + miroir synchrone (pour des appels successifs, ex. échange).
      ownershipRef.current = { ...ownershipRef.current };
      if (q <= 0) delete ownershipRef.current[key];
      else ownershipRef.current[key] = q;
      setOwnership((prev) => {
        const next = { ...prev };
        if (q <= 0) delete next[key];
        else next[key] = q;
        return next;
      });
      void setPlayerCard(accountId, cardId, q).catch((e) => {
        setError(
          `Échec de l'enregistrement (${e instanceof Error ? e.message : String(e)}). Recharge la page.`,
        );
      });
      // Historique (best-effort : n'interrompt jamais la saisie en cas d'échec).
      if (delta !== 0) {
        const reason: EventReason = opts?.reason ?? (delta > 0 ? 'add' : 'remove');
        void logEvents([
          {
            account_id: accountId,
            card_id: cardId,
            delta,
            reason,
            trade_id: opts?.tradeId ?? null,
            partner_id: opts?.partnerId ?? null,
          },
        ]).catch((e) => {
          console.error('logEvents failed', e);
        });
      }
    },
    [],
  );

  return {
    loading,
    error,
    configured: isSupabaseConfigured,
    cards,
    accounts,
    ownership,
    setQuantity,
    reload: () => void load(),
  };
}
