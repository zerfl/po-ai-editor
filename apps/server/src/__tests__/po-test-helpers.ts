import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

export function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

export function assertMsgfmtValidPo(content: string): void {
  const tempDir = mkdtempSync(join(tmpdir(), 'po-ai-editor-'));
  const filePath = join(tempDir, 'catalog.po');

  try {
    writeFileSync(filePath, content, 'utf-8');
    execFileSync('msgfmt', ['-c', '-o', '/dev/null', filePath], {
      stdio: 'pipe',
    });
  } catch (error) {
    const stderr =
      error instanceof Error && 'stderr' in error && typeof error.stderr === 'string'
        ? error.stderr
        : error instanceof Error && 'stderr' in error && Buffer.isBuffer(error.stderr)
          ? error.stderr.toString('utf-8')
          : error instanceof Error
            ? error.message
            : 'Unknown msgfmt error';
    throw new Error(stderr.trim());
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}
