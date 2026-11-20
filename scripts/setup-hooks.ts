import { execSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';

try {
  if (existsSync('.git')) {
    execSync('git config core.hooksPath .githooks', { stdio: 'inherit' });
    if (existsSync('.githooks/pre-commit')) {
      try {
        chmodSync('.githooks/pre-commit', 0o755);
      } catch {
        // Ignore chmod issues on Windows
      }
    }
    console.log('[Harness] Configured git core.hooksPath -> .githooks');
  }
} catch (err) {
  console.warn('[Harness] Could not configure git hooks:', err);
}
