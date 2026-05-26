import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
const destDir = join(root, 'public', 'assets');
const dest = join(destDir, 'sql-wasm.wasm');

try {
  if (!existsSync(src)) {
    console.warn('[copy-sql-wasm] sql-wasm.wasm não encontrado em node_modules (ok se ainda não instalou).');
    process.exit(0);
  }
  mkdirSync(destDir, { recursive: true });
  copyFileSync(src, dest);
  console.log('[copy-sql-wasm] Copiado para public/assets/sql-wasm.wasm');
} catch (e) {
  console.warn('[copy-sql-wasm]', e);
  process.exit(0);
}
