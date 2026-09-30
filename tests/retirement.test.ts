import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it('the built package has no migration entry point or retired module', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const home = mkdtempSync(join(tmpdir(), 'appledger-retired-'));
  try {
    const result = spawnSync(process.execPath, [join(root, 'dist', 'cli.js'), 'migrate', 'preview', '--root', home], { encoding: 'utf8' });
    expect(result.status).toBe(4);
    expect(result.stderr).toContain('migrate is not implemented');
    expect(existsSync(join(home, 'appledger'))).toBe(false);
    expect(existsSync(join(root, 'dist', 'migrate.js'))).toBe(false);
    const api = await import('../dist/index.js');
    expect(Object.keys(api)).not.toContain('applyMigration');
    expect(Object.keys(api)).not.toContain('previewMigration');
    expect(Object.keys(api)).not.toContain('rollbackMigration');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
