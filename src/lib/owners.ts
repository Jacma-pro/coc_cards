// Couleur d'accent déterministe par propriétaire (pour distinguer les comptes).
const PALETTE = ['#22d3ee', '#f59e0b', '#4ade80', '#f472b6', '#818cf8', '#fb7185'];

export function ownerColor(owner: string, allOwners: string[]): string {
  const idx = allOwners.indexOf(owner);
  return PALETTE[(idx < 0 ? 0 : idx) % PALETTE.length];
}

export function initials(name: string): string {
  const clean = name.replace(/[_-]+/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
