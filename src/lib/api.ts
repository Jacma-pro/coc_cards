import { isDemo, supabase } from './supabase';
import * as demo from './demo';
import type { Account, Card, CardEvent, NewCardEvent, PlayerCard } from './types';
import cardsSource from '../../cards.json';

// Ordre canonique = ordre du fichier cards.json (source de vérité).
const CARD_ORDER = new Map<string, number>(
  cardsSource.cards.map((c, i) => [c.id, i]),
);
function cardOrderIndex(id: string): number {
  return CARD_ORDER.get(id) ?? Number.MAX_SAFE_INTEGER;
}

function assertClient() {
  if (!supabase) {
    throw new Error(
      "Supabase n'est pas configuré. Copie .env.example en .env et renseigne VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.",
    );
  }
  return supabase;
}

export async function fetchCards(): Promise<Card[]> {
  if (isDemo) return demo.fetchCards();
  const client = assertClient();
  const { data, error } = await client
    .from('cards')
    .select('id, name, category, image_url');
  if (error) throw error;
  return (data ?? [])
    .map((row) => ({
      id: row.id as string,
      name: row.name as string,
      category: row.category as Card['category'],
      imageUrl: (row.image_url as string | null) ?? null,
    }))
    .sort((a, b) => cardOrderIndex(a.id) - cardOrderIndex(b.id));
}

export async function fetchAccounts(): Promise<Account[]> {
  if (isDemo) return demo.fetchAccounts();
  const client = assertClient();
  const { data, error } = await client
    .from('accounts')
    .select('id, name, owner, priority')
    .order('owner')
    .order('priority');
  if (error) throw error;
  return (data ?? []) as Account[];
}

export async function fetchPlayerCards(): Promise<PlayerCard[]> {
  if (isDemo) return demo.fetchPlayerCards();
  const client = assertClient();
  const { data, error } = await client
    .from('player_cards')
    .select('account_id, card_id, quantity');
  if (error) throw error;
  return (data ?? []) as PlayerCard[];
}

/** Upsert d'une possession. quantity<=0 supprime la ligne pour garder la table propre. */
export async function setPlayerCard(
  accountId: string,
  cardId: string,
  quantity: number,
): Promise<void> {
  if (isDemo) return demo.setPlayerCard(accountId, cardId, quantity);
  const client = assertClient();
  if (quantity <= 0) {
    const { error } = await client
      .from('player_cards')
      .delete()
      .eq('account_id', accountId)
      .eq('card_id', cardId);
    if (error) throw error;
    return;
  }
  const { error } = await client
    .from('player_cards')
    .upsert(
      { account_id: accountId, card_id: cardId, quantity },
      { onConflict: 'account_id,card_id' },
    );
  if (error) throw error;
}

/** Enregistre un ou plusieurs mouvements dans l'historique (append-only). */
export async function logEvents(events: NewCardEvent[]): Promise<void> {
  if (isDemo) return demo.logEvents(events);
  if (events.length === 0) return;
  const client = assertClient();
  const { error } = await client.from('card_events').insert(events);
  if (error) throw error;
}

/** Derniers mouvements d'un compte, du plus récent au plus ancien. */
export async function fetchEvents(accountId: string, limit = 150): Promise<CardEvent[]> {
  if (isDemo) return demo.fetchEvents(accountId, limit);
  const client = assertClient();
  const { data, error } = await client
    .from('card_events')
    .select('id, account_id, card_id, delta, reason, trade_id, partner_id, created_at')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CardEvent[];
}
