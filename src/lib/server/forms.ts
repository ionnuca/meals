import { AISLES, EVENT_SECTIONS, MEAL_TYPES, RECIPE_CATEGORIES, UNITS } from '../constants';
import { isIsoDate, isTime } from '../dates';
import { parseQuantity } from '../units';
import type { RecipeInput } from './data';

export function str(form: FormData, key: string, max = 500): string {
	return String(form.get(key) ?? '').trim().slice(0, max);
}

export function int(form: FormData, key: string, min: number, max: number, fallback: number): number {
	const n = Number(form.get(key));
	if (!Number.isInteger(n)) return fallback;
	return Math.max(min, Math.min(max, n));
}

export function optionalInt(form: FormData, key: string, min: number, max: number): number | null {
	const raw = String(form.get(key) ?? '').trim();
	if (!raw) return null;
	const n = Number(raw);
	return Number.isInteger(n) ? Math.max(min, Math.min(max, n)) : null;
}

export function id(value: unknown): number | null {
	const n = Number(value);
	return Number.isInteger(n) && n > 0 ? n : null;
}

export function dateField(form: FormData, key: string): string | null {
	const v = str(form, key, 10);
	return isIsoDate(v) ? v : null;
}

export function timeField(form: FormData, key: string): string | null {
	const v = str(form, key, 5);
	return isTime(v) ? v : null;
}

export function unitField(value: unknown): string | null {
	const v = String(value ?? '').trim().slice(0, 30);
	if (!v) return null;
	return (UNITS as readonly string[]).includes(v) ? v : v.toLowerCase();
}

export function aisleField(value: unknown): string | null {
	const v = String(value ?? '').trim().slice(0, 60);
	if (!v) return null;
	return (AISLES as readonly string[]).find((a) => a.toLowerCase() === v.toLowerCase()) ?? v;
}

export const isMealType = (v: string) => MEAL_TYPES.some((m) => m.id === v);
export const isCategory = (v: string) => RECIPE_CATEGORIES.some((c) => c.id === v);
export const isSection = (v: string) => EVENT_SECTIONS.some((s) => s.id === v);

/** Citește formularul de rețetă. Ingredientele vin ca liste paralele: ing_name, ing_qty, ing_unit, ing_aisle. */
export function parseRecipeForm(form: FormData): { data: RecipeInput } | { error: string; data: RecipeInput } {
	const names = form.getAll('ing_name').map((v) => String(v).trim().slice(0, 120));
	const qtys = form.getAll('ing_qty');
	const units = form.getAll('ing_unit');
	const aisles = form.getAll('ing_aisle');

	const ingredients = names
		.map((name, i) => ({
			name,
			quantity: parseQuantity(qtys[i]),
			unit: unitField(units[i]),
			aisle: aisleField(aisles[i])
		}))
		.filter((i) => i.name);

	const data: RecipeInput = {
		name: str(form, 'name', 120),
		category: str(form, 'category', 30),
		servings: int(form, 'servings', 1, 100, 4),
		prepMinutes: optionalInt(form, 'prep_minutes', 0, 24 * 60),
		instructions: str(form, 'instructions', 20_000),
		ingredients: ingredients.slice(0, 80)
	};

	if (!data.name) return { error: 'Scrie numele rețetei.', data };
	if (!isCategory(data.category)) return { error: 'Alege categoria.', data };
	const badQty = form.getAll('ing_qty').some((q, i) => names[i] && String(q).trim() && parseQuantity(q) === null);
	if (badQty) return { error: 'O cantitate nu e un număr valid (folosește de ex. 250, 1,5 sau 1/2).', data };
	return { data };
}
