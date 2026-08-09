import type { Account, Card, OwnershipMap } from './types';
import { ownKey } from './types';

export function quantityOf(own: OwnershipMap, accountId: string, cardId: string): number {
  return own[ownKey(accountId, cardId)] ?? 0;
}

/** Nombre de doublons disponibles à l'échange (quantity - 1, borné à 0). */
export function spareCount(own: OwnershipMap, accountId: string, cardId: string): number {
  return Math.max(0, quantityOf(own, accountId, cardId) - 1);
}

export interface DonorOffer {
  donor: Account;
  spare: number;
}

export interface TradeOpportunity {
  card: Card;
  receiver: Account;
  donors: DonorOffer[];
}

/**
 * Compare deux comptes pour l'ordre de priorité : le compte principal (priority 1)
 * d'un même propriétaire passe avant ses comptes secondaires. On regroupe d'abord
 * par propriétaire (ordre alphabétique stable), puis priority croissante.
 */
function byOwnerThenPriority(a: Account, b: Account): number {
  if (a.owner !== b.owner) return a.owner.localeCompare(b.owner);
  return a.priority - b.priority;
}

/**
 * Pour chaque compte "receveur" et chaque carte qui lui manque (quantity 0),
 * liste les comptes "donneurs" qui possèdent un doublon de cette même carte.
 * La contrainte "même catégorie" est automatiquement respectée : on n'apparie
 * qu'une carte avec elle-même, donc la catégorie est identique par construction.
 *
 * Résultat trié : receveurs par (propriétaire, priorité), puis carte par catégorie/nom
 * (l'ordre d'entrée de `cards` est conservé), donneurs par nb de doublons puis priorité.
 */
export function computeTrades(
  cards: Card[],
  accounts: Account[],
  own: OwnershipMap,
): TradeOpportunity[] {
  const receivers = [...accounts].sort(byOwnerThenPriority);
  const out: TradeOpportunity[] = [];

  for (const receiver of receivers) {
    for (const card of cards) {
      if (quantityOf(own, receiver.id, card.id) > 0) continue; // déjà obtenue

      const donors: DonorOffer[] = [];
      for (const donor of accounts) {
        if (donor.id === receiver.id) continue;
        const spare = spareCount(own, donor.id, card.id);
        if (spare > 0) donors.push({ donor, spare });
      }
      if (donors.length === 0) continue;

      donors.sort((a, b) => {
        if (b.spare !== a.spare) return b.spare - a.spare; // plus de doublons d'abord
        return byOwnerThenPriority(a.donor, b.donor);
      });

      out.push({ card, receiver, donors });
    }
  }

  return out;
}

/**
 * Matrice donneur × receveur : nombre de cartes distinctes que `donor` peut
 * transmettre à `receiver` (donneur a un doublon, receveur ne l'a pas).
 * Clé : `${donorId}:${receiverId}` -> nombre de cartes.
 */
export function computeMatrix(
  cards: Card[],
  accounts: Account[],
  own: OwnershipMap,
): Record<string, number> {
  const matrix: Record<string, number> = {};
  for (const donor of accounts) {
    for (const receiver of accounts) {
      if (donor.id === receiver.id) continue;
      let count = 0;
      for (const card of cards) {
        if (spareCount(own, donor.id, card.id) > 0 && quantityOf(own, receiver.id, card.id) === 0) {
          count += 1;
        }
      }
      if (count > 0) matrix[`${donor.id}:${receiver.id}`] = count;
    }
  }
  return matrix;
}
