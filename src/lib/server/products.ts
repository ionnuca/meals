// Catalogul de produse: listare, creare, editare, ștergere și legarea ingredientelor de produse.
import { asc, eq, sql } from 'drizzle-orm';
import { getDb, schema, type Db } from './db';
import { AISLES, DEFAULT_AISLE, UNITS } from '../constants';

const { products, recipeIngredients } = schema;

export type Product = { id: number; name: string; aisle: string; unit: string };
export type ProductWithUsage = Product & { usage: number };

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Conn = Db | Tx;

export function cleanName(name: string): string {
	const n = name.trim().replace(/\s+/g, ' ').slice(0, 120);
	return n ? n.charAt(0).toLocaleUpperCase('ro-RO') + n.slice(1) : n;
}

export function validAisle(aisle: unknown): string {
	const a = String(aisle ?? '').trim();
	return (AISLES as readonly string[]).find((x) => x.toLowerCase() === a.toLowerCase()) ?? DEFAULT_AISLE;
}

export function validUnit(unit: unknown, fallback = 'buc'): string {
	const u = String(unit ?? '').trim().toLowerCase();
	return (UNITS as readonly string[]).includes(u) ? u : fallback;
}

const cols = { id: products.id, name: products.name, aisle: products.aisle, unit: products.unit };

export async function listProducts(db: Conn = getDb()): Promise<Product[]> {
	return db.select(cols).from(products).orderBy(sql`lower(${products.name})`);
}

export async function listProductsWithUsage(db: Conn = getDb()): Promise<ProductWithUsage[]> {
	return db
		.select({
			...cols,
			// coloanele sunt scrise explicit cu tabelul, ca subinterogarea să se refere la produsul curent
			usage: sql<number>`(select count(distinct ri."recipe_id")::int from "recipe_ingredients" ri where ri."product_id" = "products"."id")`
		})
		.from(products)
		.orderBy(asc(products.aisle), sql`lower(${products.name})`);
}

export async function findProductByName(name: string, db: Conn = getDb()): Promise<Product | null> {
	const [p] = await db.select(cols).from(products).where(sql`lower(${products.name}) = lower(${cleanName(name)})`).limit(1);
	return p ?? null;
}

export async function getProduct(id: number, db: Conn = getDb()): Promise<Product | null> {
	const [p] = await db.select(cols).from(products).where(eq(products.id, id)).limit(1);
	return p ?? null;
}

/** Găsește produsul după nume sau îl adaugă în catalog. */
export async function ensureProduct(input: { name: string; aisle?: string | null; unit?: string | null }, db: Conn = getDb()): Promise<Product> {
	const name = cleanName(input.name);
	const existing = await findProductByName(name, db);
	if (existing) return existing;
	const [created] = await db
		.insert(products)
		.values({ name, aisle: validAisle(input.aisle), unit: validUnit(input.unit) })
		.onConflictDoNothing()
		.returning(cols);
	return created ?? (await findProductByName(name, db))!;
}

export type ProductError = { error: string };

export async function createProduct(input: { name: string; aisle: string; unit: string }, db: Conn = getDb()): Promise<Product | ProductError> {
	const name = cleanName(input.name);
	if (!name) return { error: 'Scrie numele produsului.' };
	if (await findProductByName(name, db)) return { error: `„${name}” există deja în catalog.` };
	const [p] = await db.insert(products).values({ name, aisle: validAisle(input.aisle), unit: validUnit(input.unit) }).returning(cols);
	return p;
}

/** Modifică produsul; numele și raionul se actualizează și în ingredientele rețetelor care îl folosesc. */
export async function updateProduct(
	id: number,
	input: { name: string; aisle: string; unit: string },
	db: Db = getDb()
): Promise<Product | ProductError> {
	const name = cleanName(input.name);
	if (!name) return { error: 'Scrie numele produsului.' };
	const other = await findProductByName(name, db);
	if (other && other.id !== id) return { error: `„${name}” există deja în catalog.` };
	return db.transaction(async (tx) => {
		const [p] = await tx
			.update(products)
			.set({ name, aisle: validAisle(input.aisle), unit: validUnit(input.unit) })
			.where(eq(products.id, id))
			.returning(cols);
		if (!p) return { error: 'Produsul nu există.' };
		await tx.update(recipeIngredients).set({ name: p.name, aisle: p.aisle }).where(eq(recipeIngredients.productId, id));
		return p;
	});
}

/** Șterge produsul doar dacă nu e folosit în nicio rețetă. */
export async function deleteProduct(id: number, db: Conn = getDb()): Promise<{ ok: true } | ProductError> {
	const [u] = await db
		.select({ n: sql<number>`count(distinct ${recipeIngredients.recipeId})::int` })
		.from(recipeIngredients)
		.where(eq(recipeIngredients.productId, id));
	if ((u?.n ?? 0) > 0) return { error: `Produsul e folosit în ${u.n} ${u.n === 1 ? 'rețetă' : 'rețete'} și nu poate fi șters.` };
	await db.delete(products).where(eq(products.id, id));
	return { ok: true };
}

export type IngredientDraft = { productId?: number | null; name: string; quantity: number | null; unit: string | null; aisle: string | null };

/**
 * Leagă fiecare ingredient de un produs din catalog: după id, apoi după nume;
 * produsele noi se adaugă în catalog cu raionul și unitatea alese în rețetă.
 */
export async function resolveIngredients(rows: IngredientDraft[], db: Conn): Promise<(IngredientDraft & { productId: number; aisle: string })[]> {
	const out = [];
	for (const r of rows) {
		let p = r.productId ? await getProduct(r.productId, db) : null;
		if (!p || (r.name && cleanName(r.name).toLowerCase() !== p.name.toLowerCase())) {
			p = await ensureProduct({ name: r.name, aisle: r.aisle, unit: r.unit }, db);
		}
		out.push({ ...r, productId: p.id, name: p.name, aisle: p.aisle });
	}
	return out;
}
