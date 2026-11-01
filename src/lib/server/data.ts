// Interogările aplicației, grupate pe entități.
import { and, asc, desc, eq, gte, ilike, inArray, lte, sql } from 'drizzle-orm';
import { getDb, schema, type Db } from './db';
import { MEAL_ORDER, mealTypeLabel } from '../constants';
import { formatDayShort } from '../dates';
import { scaleFactor } from '../units';
import type { Need } from '../shopping';

const { recipes, recipeIngredients, meals, mealDishes, events, eventItems, shoppingExtras } = schema;

// ---------------- Rețete ----------------

export type RecipeSummary = {
	id: number;
	name: string;
	category: string;
	servings: number;
	prepMinutes: number | null;
	photo: string | null;
};

const recipeSummaryCols = {
	id: recipes.id,
	name: recipes.name,
	category: recipes.category,
	servings: recipes.servings,
	prepMinutes: recipes.prepMinutes,
	photo: recipes.photo
};

export async function listRecipes(opts: { q?: string; category?: string } = {}, db: Db = getDb()): Promise<RecipeSummary[]> {
	const where = [];
	if (opts.q) where.push(ilike(recipes.name, `%${opts.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`));
	if (opts.category) where.push(eq(recipes.category, opts.category));
	return db
		.select(recipeSummaryCols)
		.from(recipes)
		.where(where.length ? and(...where) : undefined)
		.orderBy(asc(recipes.name));
}

export async function getRecipe(id: number, db: Db = getDb()) {
	const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id)).limit(1);
	if (!recipe) return null;
	const ingredients = await db
		.select()
		.from(recipeIngredients)
		.where(eq(recipeIngredients.recipeId, id))
		.orderBy(asc(recipeIngredients.position), asc(recipeIngredients.id));
	return { ...recipe, ingredients };
}

export type IngredientInput = { name: string; quantity: number | null; unit: string | null; aisle: string | null };
export type RecipeInput = {
	name: string;
	category: string;
	servings: number;
	prepMinutes: number | null;
	instructions: string;
	ingredients: IngredientInput[];
};

export async function createRecipe(input: RecipeInput, photo: string | null, db: Db = getDb()): Promise<number> {
	return db.transaction(async (tx) => {
		const [row] = await tx
			.insert(recipes)
			.values({
				name: input.name,
				category: input.category,
				servings: input.servings,
				prepMinutes: input.prepMinutes,
				instructions: input.instructions,
				photo
			})
			.returning({ id: recipes.id });
		if (input.ingredients.length) {
			await tx.insert(recipeIngredients).values(input.ingredients.map((i, position) => ({ ...i, recipeId: row.id, position })));
		}
		return row.id;
	});
}

export async function updateRecipe(id: number, input: RecipeInput, photo: string | null | undefined, db: Db = getDb()): Promise<void> {
	await db.transaction(async (tx) => {
		await tx
			.update(recipes)
			.set({
				name: input.name,
				category: input.category,
				servings: input.servings,
				prepMinutes: input.prepMinutes,
				instructions: input.instructions,
				...(photo !== undefined ? { photo } : {}),
				updatedAt: new Date()
			})
			.where(eq(recipes.id, id));
		await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
		if (input.ingredients.length) {
			await tx.insert(recipeIngredients).values(input.ingredients.map((i, position) => ({ ...i, recipeId: id, position })));
		}
	});
}

export async function deleteRecipe(id: number, db: Db = getDb()): Promise<string | null> {
	const [row] = await db.delete(recipes).where(eq(recipes.id, id)).returning({ photo: recipes.photo });
	return row?.photo ?? null;
}

/** Produsele folosite deja, cu ultimul raion ales, pentru completare automată. */
export async function ingredientCatalog(db: Db = getDb()): Promise<{ name: string; aisle: string | null }[]> {
	const rows = await db.execute<{ name: string; aisle: string | null }>(sql`
		select distinct on (lower(name)) name, aisle
		from ${recipeIngredients}
		order by lower(name), id desc
	`);
	return [...rows];
}

/** Câte mese și evenimente folosesc rețeta (afișat înainte de ștergere). */
export async function recipeUsage(id: number, db: Db = getDb()): Promise<number> {
	const [a] = await db.select({ n: sql<number>`count(*)::int` }).from(mealDishes).where(eq(mealDishes.recipeId, id));
	const [b] = await db.select({ n: sql<number>`count(*)::int` }).from(eventItems).where(eq(eventItems.recipeId, id));
	return (a?.n ?? 0) + (b?.n ?? 0);
}

// ---------------- Mese ----------------

export type DishView = { id: number; recipeId: number; name: string; category: string; photo: string | null; servings: number; prepMinutes: number | null };
export type MealView = {
	id: number;
	date: string;
	mealType: string;
	label: string;
	time: string | null;
	servings: number;
	note: string | null;
	dishes: DishView[];
};

export async function mealsBetween(from: string, to: string, db: Db = getDb()): Promise<MealView[]> {
	const rows = await db.select().from(meals).where(and(gte(meals.date, from), lte(meals.date, to)));
	return attachDishes(rows, db);
}

export async function getMeal(id: number, db: Db = getDb()): Promise<MealView | null> {
	const rows = await db.select().from(meals).where(eq(meals.id, id)).limit(1);
	const [m] = await attachDishes(rows, db);
	return m ?? null;
}

async function attachDishes(rows: (typeof meals.$inferSelect)[], db: Db): Promise<MealView[]> {
	if (!rows.length) return [];
	const dishes = await db
		.select({
			id: mealDishes.id,
			mealId: mealDishes.mealId,
			recipeId: recipes.id,
			name: recipes.name,
			category: recipes.category,
			photo: recipes.photo,
			servings: recipes.servings,
			prepMinutes: recipes.prepMinutes
		})
		.from(mealDishes)
		.innerJoin(recipes, eq(recipes.id, mealDishes.recipeId))
		.where(inArray(mealDishes.mealId, rows.map((r) => r.id)))
		.orderBy(asc(mealDishes.position), asc(mealDishes.id));
	return rows
		.map((m) => ({
			...m,
			label: mealTypeLabel(m.mealType),
			dishes: dishes.filter((d) => d.mealId === m.id).map(({ mealId: _, ...d }) => d)
		}))
		.sort(
			(a, b) =>
				a.date.localeCompare(b.date) ||
				(a.time ?? '99').localeCompare(b.time ?? '99') ||
				(MEAL_ORDER[a.mealType] ?? 9) - (MEAL_ORDER[b.mealType] ?? 9) ||
				a.id - b.id
		);
}

export async function nextDishPosition(mealId: number, db: Db = getDb()): Promise<number> {
	const [r] = await db.select({ n: sql<number>`coalesce(max(${mealDishes.position}), -1)::int` }).from(mealDishes).where(eq(mealDishes.mealId, mealId));
	return (r?.n ?? -1) + 1;
}

/** Produsele unei mese, scalate la porțiile ei (pentru pagina mesei). */
export async function mealIngredients(meal: MealView, db: Db = getDb()) {
	if (!meal.dishes.length) return [];
	const ids = [...new Set(meal.dishes.map((d) => d.recipeId))];
	const ings = await db.select().from(recipeIngredients).where(inArray(recipeIngredients.recipeId, ids));
	const needs: Need[] = [];
	for (const d of meal.dishes) {
		const f = scaleFactor(meal.servings, d.servings);
		for (const i of ings.filter((x) => x.recipeId === d.recipeId)) {
			needs.push({ name: i.name, quantity: i.quantity === null ? null : i.quantity * f, unit: i.unit, aisle: i.aisle, source: d.name });
		}
	}
	return needs;
}

// ---------------- Evenimente ----------------

export type EventItemView = {
	id: number;
	section: string;
	recipeId: number | null;
	name: string;
	category: string | null;
	photo: string | null;
	recipeServings: number | null;
	quantity: number | null;
	unit: string | null;
	aisle: string | null;
};

export async function eventsBetween(from: string, to: string, db: Db = getDb()) {
	return db
		.select({
			id: events.id,
			date: events.date,
			time: events.time,
			name: events.name,
			guests: events.guests,
			itemCount: sql<number>`(select count(*)::int from ${eventItems} where ${eventItems.eventId} = ${events.id})`
		})
		.from(events)
		.where(and(gte(events.date, from), lte(events.date, to)))
		.orderBy(asc(events.date), asc(events.time));
}

export async function upcomingEvents(fromDate: string, limit = 5, db: Db = getDb()) {
	return db
		.select({
			id: events.id,
			date: events.date,
			time: events.time,
			name: events.name,
			guests: events.guests,
			itemCount: sql<number>`(select count(*)::int from ${eventItems} where ${eventItems.eventId} = ${events.id})`
		})
		.from(events)
		.where(gte(events.date, fromDate))
		.orderBy(asc(events.date), asc(events.time))
		.limit(limit);
}

export async function getEvent(id: number, db: Db = getDb()) {
	const [ev] = await db.select().from(events).where(eq(events.id, id)).limit(1);
	if (!ev) return null;
	const items: EventItemView[] = await db
		.select({
			id: eventItems.id,
			section: eventItems.section,
			recipeId: eventItems.recipeId,
			name: sql<string>`coalesce(${recipes.name}, ${eventItems.name}, '')`,
			category: recipes.category,
			photo: recipes.photo,
			recipeServings: recipes.servings,
			quantity: eventItems.quantity,
			unit: eventItems.unit,
			aisle: eventItems.aisle
		})
		.from(eventItems)
		.leftJoin(recipes, eq(recipes.id, eventItems.recipeId))
		.where(eq(eventItems.eventId, id))
		.orderBy(asc(eventItems.position), asc(eventItems.id));
	return { ...ev, items };
}

// ---------------- Lista de cumpărături ----------------

export function periodKey(from: string, to: string): string {
	return `${from}_${to}`;
}

/** Toate produsele necesare în perioadă: mese (după porții), evenimente (după persoane) și adăugiri manuale. */
export async function shoppingNeeds(from: string, to: string, db: Db = getDb()): Promise<Need[]> {
	const needs: Need[] = [];

	// Mese: cantitatea din rețetă × porțiile mesei / porțiile rețetei
	const mealRows = await db
		.select({
			date: meals.date,
			mealType: meals.mealType,
			mealServings: meals.servings,
			recipeName: recipes.name,
			recipeServings: recipes.servings,
			name: recipeIngredients.name,
			quantity: recipeIngredients.quantity,
			unit: recipeIngredients.unit,
			aisle: recipeIngredients.aisle
		})
		.from(meals)
		.innerJoin(mealDishes, eq(mealDishes.mealId, meals.id))
		.innerJoin(recipes, eq(recipes.id, mealDishes.recipeId))
		.innerJoin(recipeIngredients, eq(recipeIngredients.recipeId, recipes.id))
		.where(and(gte(meals.date, from), lte(meals.date, to)));
	for (const r of mealRows) {
		const f = scaleFactor(r.mealServings, r.recipeServings);
		needs.push({
			name: r.name,
			quantity: r.quantity === null ? null : r.quantity * f,
			unit: r.unit,
			aisle: r.aisle,
			source: `${r.recipeName} · ${formatDayShort(r.date)}`
		});
	}

	// Evenimente: rețetele se scalează după numărul de persoane
	const evRecipeRows = await db
		.select({
			eventName: events.name,
			date: events.date,
			guests: events.guests,
			recipeName: recipes.name,
			recipeServings: recipes.servings,
			name: recipeIngredients.name,
			quantity: recipeIngredients.quantity,
			unit: recipeIngredients.unit,
			aisle: recipeIngredients.aisle
		})
		.from(events)
		.innerJoin(eventItems, eq(eventItems.eventId, events.id))
		.innerJoin(recipes, eq(recipes.id, eventItems.recipeId))
		.innerJoin(recipeIngredients, eq(recipeIngredients.recipeId, recipes.id))
		.where(and(gte(events.date, from), lte(events.date, to)));
	for (const r of evRecipeRows) {
		const f = scaleFactor(r.guests, r.recipeServings);
		needs.push({
			name: r.name,
			quantity: r.quantity === null ? null : r.quantity * f,
			unit: r.unit,
			aisle: r.aisle,
			source: `${r.eventName} · ${formatDayShort(r.date)}`
		});
	}

	// Evenimente: produse libere (băuturi etc.), cu cantitatea scrisă direct
	const evFreeRows = await db
		.select({ eventName: events.name, date: events.date, name: eventItems.name, quantity: eventItems.quantity, unit: eventItems.unit, aisle: eventItems.aisle })
		.from(events)
		.innerJoin(eventItems, eq(eventItems.eventId, events.id))
		.where(and(gte(events.date, from), lte(events.date, to), sql`${eventItems.recipeId} is null`));
	for (const r of evFreeRows) {
		if (!r.name) continue;
		needs.push({ name: r.name, quantity: r.quantity, unit: r.unit, aisle: r.aisle, source: `${r.eventName} · ${formatDayShort(r.date)}` });
	}

	// Adăugiri manuale
	const extras = await db.select().from(shoppingExtras).where(eq(shoppingExtras.period, periodKey(from, to))).orderBy(desc(shoppingExtras.id));
	for (const e of extras) {
		needs.push({ name: e.name, quantity: e.quantity, unit: e.unit, aisle: e.aisle, source: 'adăugat manual' });
	}
	return needs;
}

export { mealTypeLabel };
