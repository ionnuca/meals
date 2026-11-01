// Test de integrare pe un PostgreSQL real: migrații, mese cu mai multe feluri, porții, evenimente și lista agregată.
// Rulează doar dacă TEST_DATABASE_URL e setat (baza e golită la început!).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb, runMigrations, schema, type Db } from '../../src/lib/server/db';
import { createRecipe, getEvent, getMeal, mealsBetween, shoppingNeeds, updateRecipe } from '../../src/lib/server/data';
import { aggregate } from '../../src/lib/shopping';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('lista de cumpărături din baza de date', () => {
	let db: Db;
	let close: () => Promise<void>;

	beforeAll(async () => {
		({ db, close } = createDb(url!));
		await db.execute(sql`drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;`);
		await runMigrations(db);
	});

	afterAll(async () => close?.());

	it('scalează rețetele după porțiile mesei și persoanele evenimentului', async () => {
		// Rețete scrise pentru 4 porții
		const ciorba = await createRecipe(
			{
				name: 'Ciorbă de perișoare',
				category: 'supa',
				servings: 4,
				prepMinutes: 50,
				instructions: '',
				ingredients: [
					{ name: 'Carne tocată', quantity: 300, unit: 'g', aisle: 'Carne și pește' },
					{ name: 'Ceapă', quantity: 1, unit: 'buc', aisle: 'Legume și fructe' },
					{ name: 'Sare', quantity: null, unit: 'după gust', aisle: 'Condimente' }
				]
			},
			null,
			db
		);
		const sarmale = await createRecipe(
			{
				name: 'Sarmale',
				category: 'fel_principal',
				servings: 4,
				prepMinutes: 120,
				instructions: '',
				ingredients: [
					{ name: 'Carne tocată', quantity: 0.5, unit: 'kg', aisle: 'Carne și pește' },
					{ name: 'Ceapă', quantity: 2, unit: 'buc', aisle: 'Legume și fructe' },
					{ name: 'Smântână', quantity: 300, unit: 'g', aisle: 'Lactate și ouă' }
				]
			},
			null,
			db
		);

		// Prânz de marți: 2 feluri, 6 porții (factor 1,5)
		const [pranz] = await db.insert(schema.meals).values({ date: '2026-11-03', mealType: 'pranz', time: '13:00', servings: 6 }).returning();
		await db.insert(schema.mealDishes).values([
			{ mealId: pranz.id, recipeId: ciorba, position: 0 },
			{ mealId: pranz.id, recipeId: sarmale, position: 1 }
		]);

		// Eveniment: 8 persoane (factor 2), sarmale + vin
		const [ev] = await db.insert(schema.events).values({ date: '2026-11-04', time: '19:00', name: 'Cina cu prietenii', guests: 8 }).returning();
		await db.insert(schema.eventItems).values([
			{ eventId: ev.id, section: 'principale', recipeId: sarmale, position: 0 },
			{ eventId: ev.id, section: 'bauturi', name: 'Vin roșu', quantity: 3, unit: 'sticlă', aisle: 'Băuturi', position: 1 }
		]);

		// O masă în afara perioadei nu trebuie să apară
		const [alta] = await db.insert(schema.meals).values({ date: '2026-11-20', mealType: 'cina', servings: 2 }).returning();
		await db.insert(schema.mealDishes).values({ mealId: alta.id, recipeId: sarmale, position: 0 });

		const meal = await getMeal(pranz.id, db);
		expect(meal?.dishes.map((d) => d.name)).toEqual(['Ciorbă de perișoare', 'Sarmale']);
		expect((await mealsBetween('2026-11-02', '2026-11-08', db)).length).toBe(1);
		expect((await getEvent(ev.id, db))?.items.map((i) => i.name)).toEqual(['Sarmale', 'Vin roșu']);

		const groups = aggregate(await shoppingNeeds('2026-11-02', '2026-11-08', db));
		const find = (name: string) => groups.flatMap((g) => g.items).find((i) => i.name === name);

		// carne: prânz (300 + 500) × 1,5 = 1200 g; eveniment 500 × 2 = 1000 g → 2,2 kg
		expect(find('Carne tocată')?.quantity).toBeCloseTo(2200);
		expect(find('Carne tocată')?.display).toBe('2,2 kg');
		// ceapă: (1 + 2) × 1,5 = 4,5; eveniment 2 × 2 = 4 → 8,5 → 9 buc
		expect(find('Ceapă')?.quantity).toBeCloseTo(8.5);
		expect(find('Ceapă')?.display).toBe('9 buc');
		// smântână: 300 × 1,5 + 300 × 2 = 1050 g
		expect(find('Smântână')?.display).toBe('1,05 kg');
		// băutura rămâne la cantitatea scrisă
		expect(find('Vin roșu')?.display).toBe('3 sticlă');
		expect(find('Sare')?.display).toBe('după gust');
		expect(find('Carne tocată')?.sources).toEqual(['Ciorbă de perișoare · 3 nov', 'Sarmale · 3 nov', 'Cina cu prietenii · 4 nov']);
	});

	it('actualizează ingredientele unei rețete fără să strice mesele', async () => {
		const id = await createRecipe(
			{ name: 'Omletă', category: 'mic_dejun', servings: 1, prepMinutes: 10, instructions: 'Bate ouăle.', ingredients: [{ name: 'Ouă', quantity: 2, unit: 'buc', aisle: 'Lactate și ouă' }] },
			null,
			db
		);
		const [m] = await db.insert(schema.meals).values({ date: '2026-11-05', mealType: 'mic_dejun', servings: 3 }).returning();
		await db.insert(schema.mealDishes).values({ mealId: m.id, recipeId: id });
		await updateRecipe(id, { name: 'Omletă cu legume', category: 'mic_dejun', servings: 1, prepMinutes: 15, instructions: '', ingredients: [{ name: 'Ouă', quantity: 3, unit: 'buc', aisle: 'Lactate și ouă' }] }, undefined, db);
		const groups = aggregate(await shoppingNeeds('2026-11-05', '2026-11-05', db));
		expect(groups.flatMap((g) => g.items).find((i) => i.name === 'Ouă')?.quantity).toBe(9);
		expect((await getMeal(m.id, db))?.dishes[0].name).toBe('Omletă cu legume');
	});
});
