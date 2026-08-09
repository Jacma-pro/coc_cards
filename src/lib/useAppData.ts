import { useCallback, useEffect, useState } from 'react';
import { fetchAccounts, fetchCards, fetchPlayerCards, setPlayerCard } from './api';
import { isSupabaseConfigured } from './supabase';
import type { Account, Card, OwnershipMap } from './types';
import { ownKey } from './types';

export interface AppData {
  loading: boolean;
  error: string | null;
  configured: boolean;
  cards: Card[];
  accounts: Account[];
  ownership: OwnershipMap;
  /** Met à jour la quantité possédée (0 = manquante). Optimiste + persistance Supabase. */
  setQuantity: (accountId: string, cardId: string, quantity: number) => void;
  reload: () => void;
}

export function useAppData(): AppData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ownership, setOwnership] = useState<OwnershipMap>({});

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

  const setQuantity = useCallback(
    (accountId: string, cardId: string, quantity: number) => {
      const q = Math.max(0, Math.floor(quantity));
      const key = ownKey(accountId, cardId);
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
