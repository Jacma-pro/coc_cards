import type { Category } from './types';

export interface CategoryMeta {
  id: Category;
  label: string;
  /** couleur de contour appliquée sur l'image de la carte */
  color: string;
  /** teinte douce pour les fonds / accents */
  soft: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'elixir', label: 'Élixir', color: '#ff5fa2', soft: 'rgba(255, 95, 162, 0.15)' },
  { id: 'elixir_noir', label: 'Élixir noir', color: '#a855f7', soft: 'rgba(168, 85, 247, 0.15)' },
  { id: 'base_ouvriers', label: 'Base des ouvriers', color: '#3b9dff', soft: 'rgba(59, 157, 255, 0.15)' },
  { id: 'super_troupes', label: 'Super troupes', color: '#ff8c26', soft: 'rgba(255, 140, 38, 0.15)' },
];

export const CATEGORY_ORDER: Category[] = CATEGORIES.map((c) => c.id);

const byId = new Map<Category, CategoryMeta>(CATEGORIES.map((c) => [c.id, c]));

export function categoryMeta(id: Category): CategoryMeta {
  const meta = byId.get(id);
  if (!meta) throw new Error(`Catégorie inconnue: ${id}`);
  return meta;
}
