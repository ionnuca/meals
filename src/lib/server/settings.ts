// Setări comune ale familiei.
import { getDb, schema, type Db } from './db';
import { MEAL_TYPES } from '../constants';

export const FALLBACK_SERVINGS = 2;

export type MealDefaults = Record<string, number>;
export type MealSettings = { servings: MealDefaults; daily: string[] };

/** Porțiile implicite și mesele zilnice, pentru fiecare tip de masă. */
export async function getMealSettings(db: Db = getDb()): Promise<MealSettings> {
	const rows = await db.select().from(schema.mealDefaults);
	const servings: MealDefaults = {};
	const daily: string[] = [];
	for (const t of MEAL_TYPES) {
		const r = rows.find((x) => x.mealType === t.id);
		servings[t.id] = r?.servings ?? FALLBACK_SERVINGS;
		if (r?.daily) daily.push(t.id);
	}
	return { servings, daily };
}

/** Porțiile implicite pentru fiecare tip de masă; tipurile fără valoare primesc 2. */
export async function getMealDefaults(db: Db = getDb()): Promise<MealDefaults> {
	return (await getMealSettings(db)).servings;
}

/** Salvează porțiile implicite și, dacă e dat, setul de mese care apar în fiecare zi. */
export async function saveMealDefaults(values: MealDefaults, daily?: string[], db: Db = getDb()): Promise<void> {
	const current = await getMealSettings(db);
	await db.transaction(async (tx) => {
		for (const t of MEAL_TYPES) {
			const n = Math.round(Number(values[t.id]));
			const servings = Number.isFinite(n) ? Math.max(1, Math.min(100, n)) : current.servings[t.id];
			const isDaily = daily ? daily.includes(t.id) : current.daily.includes(t.id);
			await tx
				.insert(schema.mealDefaults)
				.values({ mealType: t.id, servings, daily: isDaily })
				.onConflictDoUpdate({ target: schema.mealDefaults.mealType, set: { servings, daily: isDaily } });
		}
	});
}
