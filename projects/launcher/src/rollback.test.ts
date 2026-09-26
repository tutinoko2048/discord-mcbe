import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rollback } from './install';

describe('rollback', () => {
  test('swaps the current and backup installations', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'discord-mcbe-launcher-'));
    const appDir = join(cwd, 'app');
    const backupDir = join(cwd, 'app.backup');
    await mkdir(appDir);
    await mkdir(backupDir);
    await writeFile(join(appDir, '.VERSION'), '4.0.0');
    await writeFile(join(backupDir, '.VERSION'), '3.0.0');

    try {
      await rollback({ cwd });
      expect(await readFile(join(appDir, '.VERSION'), 'utf8')).toBe('3.0.0');
      expect(await readFile(join(backupDir, '.VERSION'), 'utf8')).toBe('4.0.0');

      await rollback({ cwd });
      expect(await readFile(join(appDir, '.VERSION'), 'utf8')).toBe('4.0.0');
      expect(await readFile(join(backupDir, '.VERSION'), 'utf8')).toBe('3.0.0');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
