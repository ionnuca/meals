// Porțiile implicite pe tip de masă.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb, runMigrations, type Db } from '../../src/lib/server/db';
import { getMealDefaults, saveMealDefaults } from '../../src/lib/server/settings';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('porțiile implicite', () => {
	let db: Db;
	let close: () => Promise<void>;
	beforeAll(async () => {
		({ db, close } = createDb(url!));
		await db.execute(sql`drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;`);
		await runMigrations(db);
	});
	afterAll(async () => close?.());

	it('pornesc de la 2 și se salvează în limitele permise', async () => {
		expect(await getMealDefaults(db)).toEqual({ mic_dejun: 2, pranz: 2, gustare: 2, cina: 2, alta: 2 });
		await saveMealDefaults({ mic_dejun: 3, pranz: 4, gustare: 0, cina: 250, alta: Number.NaN }, db);
		expect(await getMealDefaults(db)).toEqual({ mic_dejun: 3, pranz: 4, gustare: 1, cina: 100, alta: 2 });
	});
});
