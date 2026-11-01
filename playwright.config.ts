import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? 'postgres://meals:meals@127.0.0.1:5433/meals_e2e';

export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: false,
	workers: 1,
	timeout: 60_000,
	use: {
		baseURL: `http://localhost:${PORT}`,
		...devices['Pixel 7'],
		channel: process.env.PW_CHANNEL ?? 'chrome',
		locale: 'ro-RO',
		timezoneId: 'Europe/Chisinau',
		trace: 'retain-on-failure'
	},
	webServer: {
		command: 'node tests/e2e/reset-db.mjs && node build',
		port: PORT,
		reuseExistingServer: false,
		timeout: 60_000,
		env: {
			PORT: String(PORT),
			ORIGIN: `http://localhost:${PORT}`,
			DATABASE_URL,
			UPLOAD_DIR: 'test-results/uploads',
			BODY_SIZE_LIMIT: '10M',
			APP_TZ: 'Europe/Chisinau'
		}
	}
});
