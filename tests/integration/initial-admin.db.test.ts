// Primul cont creat automat din variabile de mediu (instalarea automată pe server).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb, runMigrations, type Db } from '../../src/lib/server/db';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('primul cont din INITIAL_ADMIN_*', () => {
	let db: Db;
	let close: () => Promise<void>;

	beforeAll(async () => {
		({ db, close } = createDb(url!));
		await db.execute(sql`drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;`);
		await runMigrations(db);
		process.env.DATABASE_URL = url; // getDb() din aplicație folosește aceeași bază
	});

	afterAll(async () => close?.());

	it('creează contul o singură dată și nu îl rescrie', async () => {
		const { ensureInitialAdmin, verifyPassword } = await import('../../src/lib/server/auth');
		expect(await ensureInitialAdmin({})).toBe('skipped');
		await expect(ensureInitialAdmin({ INITIAL_ADMIN_EMAIL: 'x@y.md', INITIAL_ADMIN_PASSWORD: 'scurt' })).rejects.toThrow(/INITIAL_ADMIN_PASSWORD/);

		const env = { INITIAL_ADMIN_EMAIL: ' Ion@Example.com ', INITIAL_ADMIN_PASSWORD: 'p@ss$word#1234', INITIAL_ADMIN_NAME: 'Ion' };
		expect(await ensureInitialAdmin(env)).toBe('created');
		expect(await ensureInitialAdmin({ ...env, INITIAL_ADMIN_PASSWORD: 'alta-parola-lunga' })).toBe('exists');

		const rows = await db.execute<{ email: string; name: string; password_hash: string }>(sql`select email, name, password_hash from users`);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ email: 'ion@example.com', name: 'Ion' });
		expect(await verifyPassword('p@ss$word#1234', rows[0].password_hash)).toBe(true);
	});
});
