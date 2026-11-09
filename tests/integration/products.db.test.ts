// Catalogul de produse: migrația cu produsele predefinite, legarea ingredientelor, redenumirea și ștergerea.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createDb, migrationsFolder, runMigrations, schema, type Db } from '../../src/lib/server/db';
import { createRecipe, getRecipe, shoppingNeeds } from '../../src/lib/server/data';
import { createProduct, deleteProduct, ensureProduct, listProducts, listProductsWithUsage, updateProduct } from '../../src/lib/server/products';
import { aggregate } from '../../src/lib/shopping';

const url = process.env.TEST_DATABASE_URL;

async function reset(db: Db) {
	await db.execute(sql`drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;`);
}

describe.skipIf(!url)('catalogul de produse', () => {
	let db: Db;
	let close: () => Promise<void>;

	beforeAll(async () => {
		({ db, close } = createDb(url!));
	});
	afterAll(async () => close?.());

	it('migrația păstrează ingredientele vechi și le leagă de catalog', async () => {
		await reset(db);
		// doar prima migrație (starea dinainte de catalog), cu o rețetă veche
		const dir = mkdtempSync(path.join(tmpdir(), 'mig-'));
		cpSync(migrationsFolder(), dir, { recursive: true });
		const journalPath = path.join(dir, 'meta', '_journal.json');
		const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
		journal.entries = journal.entries.slice(0, 1);
		writeFileSync(journalPath, JSON.stringify(journal));
		await migrate(db, { migrationsFolder: dir });
		await db.execute(sql`insert into recipes (id, name, category, servings) values (1, 'Veche', 'supa', 4)`);
		await db.execute(sql`insert into recipe_ingredients (recipe_id, name, quantity, unit, aisle) values
			(1, 'ceapă', 1, 'buc', 'Legume și fructe'), (1, 'Borș de casă', 500, 'ml', 'Conserve și murături')`);

		await runMigrations(db);
		const products = await listProducts(db);
		expect(products.length).toBeGreaterThan(150);
		expect(products.filter((p) => p.name.toLowerCase() === 'ceapă')).toHaveLength(1);
		expect(products.find((p) => p.name === 'Borș de casă')).toMatchObject({ aisle: 'Conserve și murături', unit: 'ml' });
		const r = await getRecipe(1, db);
		expect(r!.ingredients.every((i) => i.productId !== null)).toBe(true);
	});

	it('ingredientele se leagă de produs, iar redenumirea se vede în rețete și în listă', async () => {
		await reset(db);
		await runMigrations(db);
		const ceapa = (await listProducts(db)).find((p) => p.name === 'Ceapă')!;
		const id = await createRecipe(
			{
				name: 'Ciorbă',
				category: 'supa',
				servings: 2,
				prepMinutes: null,
				instructions: '',
				ingredients: [
					{ productId: ceapa.id, name: 'Ceapă', quantity: 1, unit: 'buc', aisle: null },
					{ productId: null, name: 'leuștean', quantity: 1, unit: 'legătură', aisle: null },
					{ productId: null, name: 'Zeamă secretă', quantity: 200, unit: 'ml', aisle: 'Băcănie' }
				]
			},
			null,
			db
		);
		const r = await getRecipe(id, db);
		// produsul existent e găsit după nume (fără diferențe de majuscule); cel nou intră în catalog cu raionul ales
		expect(r!.ingredients.map((i) => [i.name, i.aisle])).toEqual([
			['Ceapă', 'Legume și fructe'],
			['Leuștean', 'Legume și fructe'],
			['Zeamă secretă', 'Băcănie']
		]);
		const nou = await ensureProduct({ name: 'zeamă SECRETĂ' }, db);
		expect(nou.aisle).toBe('Băcănie');

		const updated = await updateProduct(nou.id, { name: 'Zeamă de casă', aisle: 'Conserve și murături', unit: 'l' }, db);
		expect(updated).toMatchObject({ name: 'Zeamă de casă', unit: 'l' });
		expect((await getRecipe(id, db))!.ingredients[2]).toMatchObject({ name: 'Zeamă de casă', aisle: 'Conserve și murături', unit: 'ml' });

		const [meal] = await db.insert(schema.meals).values({ date: '2030-01-01', mealType: 'pranz', servings: 2 }).returning();
		await db.insert(schema.mealDishes).values({ mealId: meal.id, recipeId: id });
		const items = aggregate(await shoppingNeeds('2030-01-01', '2030-01-01', db)).flatMap((g) => g.items.map((i) => [g.aisle, i.name]));
		expect(items).toContainEqual(['Conserve și murături', 'Zeamă de casă']);

		// numele duplicat e refuzat, iar produsul folosit nu poate fi șters
		expect(await updateProduct(nou.id, { name: 'ceapă', aisle: 'Altele', unit: 'buc' }, db)).toHaveProperty('error');
		expect(await createProduct({ name: ' CEAPĂ ', aisle: 'Altele', unit: 'buc' }, db)).toHaveProperty('error');
		expect(await deleteProduct(nou.id, db)).toHaveProperty('error');
		expect((await listProductsWithUsage(db)).find((p) => p.id === nou.id)?.usage).toBe(1);

		const liber = await createProduct({ name: 'Quinoa', aisle: 'necunoscut', unit: 'xyz' }, db);
		expect(liber).toMatchObject({ name: 'Quinoa', aisle: 'Altele', unit: 'buc' });
		expect(await deleteProduct((liber as { id: number }).id, db)).toEqual({ ok: true });
	});
});
