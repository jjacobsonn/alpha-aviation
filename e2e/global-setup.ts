import { execFileSync } from 'child_process';
import path from 'path';

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const seedScript = path.join(rootDir, 'e2e', 'scripts', 'provision-e2e-user.py');

export default async function globalSetup() {
  execFileSync('poetry', ['run', 'python', seedScript], {
    cwd: backendDir,
    stdio: 'inherit',
  });
}