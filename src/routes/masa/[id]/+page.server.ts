import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb, schema } from '#lib/server/db/index.ts';
import { getMeal, listRecipes, nextDishPosition } from '#lib/server/data.ts';
import { id as parseId, int, isMealType, isPast, PAST_MESSAGE, str, timeField } from '#lib/server/forms.ts';
import type { Actions, PageServerLoad } from './$types';

async function requireMeal(idParam: string) {
	const mealId = parseId(idParam);
	const meal = mealId ? await getMeal(mealId) : null;
	if (!meal) error(404, 'Masa nu există');
	return meal;
}

/** Masa poate fi modificată doar dacă e de azi sau din viitor. */
async function requireEditableMeal(idParam: string) {
	const meal = await requireMeal(idParam);
	return isPast(meal.date) ? null : meal;
}

export const load: PageServerLoad = async ({ params }) => {
	const meal = await requireMeal(params.id);
	const db = getDb();
	const recipeIds = [...new Set(meal.dishes.map((d) => d.recipeId))];
	const ings = recipeIds.length
		? await db.select().from(schema.recipeIngredients).where(inArray(schema.recipeIngredients.recipeId, recipeIds))
		: [];
	// Cantitățile din rețete, nescalate; pagina le scalează după porțiile alese.
	const raw = meal.dishes.flatMap((d) =>
		ings
			.filter((i) => i.recipeId === d.recipeId)
			.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, aisle: i.aisle, recipeServings: d.servings, source: d.name }))
	);
	return { meal, raw, past: isPast(meal.date), recipes: await listRecipes() };
};

export const actions: Actions = {
	servings: async ({ params, request }) => {
		const meal = await requireEditableMeal(params.id);
		if (!meal) return fail(400, { message: PAST_MESSAGE });
		const form = await request.formData();
		const servings = int(form, 'servings', 1, 100, meal.servings);
		await getDb().update(schema.meals).set({ servings }).where(eq(schema.meals.id, meal.id));
		return { saved: true };
	},

	update: async ({ params, request }) => {
		const meal = await requireEditableMeal(params.id);
		if (!meal) return fail(400, { message: PAST_MESSAGE });
		const form = await request.formData();
		const mealType = str(form, 'meal_type', 20);
		if (!isMealType(mealType)) return fail(400, { message: 'Tip de masă invalid.' });
		await getDb()
			.update(schema.meals)
			.set({ mealType, time: timeField(form, 'time'), note: str(form, 'note', 200) || null })
			.where(eq(schema.meals.id, meal.id));
		return { saved: true };
	},

	addDish: async ({ params, request }) => {
		const meal = await requireEditableMeal(params.id);
		if (!meal) return fail(400, { message: PAST_MESSAGE });
		const form = await request.formData();
		const recipeId = parseId(form.get('recipe_id'));
		if (!recipeId) return fail(400, { message: 'Alege o rețetă.' });
		const db = getDb();
		const [exists] = await db.select({ id: schema.recipes.id }).from(schema.recipes).where(eq(schema.recipes.id, recipeId));
		if (!exists) return fail(400, { message: 'Rețeta nu există.' });
		await db.insert(schema.mealDishes).values({ mealId: meal.id, recipeId, position: await nextDishPosition(meal.id) });
		return { added: true };
	},

	removeDish: async ({ params, request }) => {
		const meal = await requireEditableMeal(params.id);
		if (!meal) return fail(400, { message: PAST_MESSAGE });
		const form = await request.formData();
		const dishId = parseId(form.get('dish_id'));
		if (dishId) {
			await getDb()
				.delete(schema.mealDishes)
				.where(and(eq(schema.mealDishes.id, dishId), eq(schema.mealDishes.mealId, meal.id)));
		}
		return { removed: true };
	},

	delete: async ({ params }) => {
		const meal = await requireEditableMeal(params.id);
		if (!meal) return fail(400, { message: PAST_MESSAGE });
		await getDb().delete(schema.meals).where(eq(schema.meals.id, meal.id));
		redirect(303, `/zi/${meal.date}`);
	}
};
