// Seed Supabase depuis cards.json / accounts.json (à la racine du repo).
// Usage : npm run import
// Nécessite dans .env : VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// (la clé service_role contourne la RLS pour le seed initial — jamais côté front).

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

if (existsSync(join(root, '.env'))) process.loadEnvFile(join(root, '.env'));

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// Clé serveur : nouveau format `sb_secret_...` ou ancien `service_role` JWT.
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    '✗ Il manque l\'URL et/ou la clé secrète dans .env\n' +
      '  Attendu : SUPABASE_URL + SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY)\n' +
      '  (Supabase Dashboard > Project Settings > API)',
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const readJson = (name) => JSON.parse(readFileSync(join(root, name), 'utf8'));

async function main() {
  const { cards } = readJson('cards.json');
  const { accounts } = readJson('accounts.json');

  console.log(`→ Import de ${accounts.length} comptes…`);
  const { error: accErr } = await supabase
    .from('accounts')
    .upsert(accounts, { onConflict: 'id' });
  if (accErr) throw accErr;

  console.log(`→ Import de ${cards.length} cartes…`);
  const cardRows = cards.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    image_url: c.imageUrl ?? null,
  }));
  const { error: cardErr } = await supabase
    .from('cards')
    .upsert(cardRows, { onConflict: 'id' });
  if (cardErr) throw cardErr;

  console.log('✓ Import terminé.');
}

main().catch((e) => {
  console.error('✗ Échec de l\'import :', e.message ?? e);
  process.exit(1);
});
