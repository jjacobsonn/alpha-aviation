import { defineConfig } from '@playwright/test';
import path from 'path';

const rootDir = path.resolve(__dirname, '..');
const authStatePath = path.join(rootDir, '.auth', 'e2e-user.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  globalSetup: require.resolve('./global-setup'),
  outputDir: './test-results',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: 'login',
      testMatch: /login\.spec\.ts/,
    },
    {
      name: 'anonymous',
      testMatch: /redirect\.spec\.ts/,
    },
    {
      name: 'authenticated',
      testMatch: /smoke\.spec\.ts/,
      use: {
        storageState: authStatePath,
      },
    },
  ],
});