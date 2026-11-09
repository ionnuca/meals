// Setări comune ale familiei.
import { getDb, schema, type Db } from './db';
import { MEAL_TYPES } from '../constants';

export const FALLBACK_SERVINGS = 2;

export type MealDefaults = Record<string, number>;

/** Porțiile implicite pentru fiecare tip de masă; tipurile fără valoare primesc 2. */
export async function getMealDefaults(db: Db = getDb()): Promise<MealDefaults> {
	const rows = await db.select().from(schema.mealDefaults);
	const out: MealDefaults = {};
	for (const t of MEAL_TYPES) out[t.id] = rows.find((r) => r.mealType === t.id)?.servings ?? FALLBACK_SERVINGS;
	return out;
}

export async function saveMealDefaults(values: MealDefaults, db: Db = getDb()): Promise<void> {
	await db.transaction(async (tx) => {
		for (const t of MEAL_TYPES) {
			const n = Math.round(Number(values[t.id]));
			if (!Number.isFinite(n)) continue;
			const servings = Math.max(1, Math.min(100, n));
			await tx
				.insert(schema.mealDefaults)
				.values({ mealType: t.id, servings })
				.onConflictDoUpdate({ target: schema.mealDefaults.mealType, set: { servings } });
		}
	});
}
