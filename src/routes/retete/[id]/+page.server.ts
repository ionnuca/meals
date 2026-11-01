import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '#lib/server/db/index.ts';
import { deleteRecipe, getRecipe, nextDishPosition, recipeUsage } from '#lib/server/data.ts';
import { dateField, id as parseId, int, isMealType, str } from '#lib/server/forms.ts';
import { deletePhoto } from '#lib/server/uploads.ts';
import { today } from '#lib/dates.ts';
import { MEAL_TYPES } from '#lib/constants.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const recipeId = parseId(params.id);
	const recipe = recipeId ? await getRecipe(recipeId) : null;
	if (!recipe) error(404, 'Rețeta nu există');
	return { recipe, usage: await recipeUsage(recipe.id), today: today(process.env.APP_TZ) };
};

export const actions: Actions = {
	delete: async ({ params }) => {
		const recipeId = parseId(params.id);
		if (!recipeId) error(404, 'Rețeta nu există');
		const photo = await deleteRecipe(recipeId);
		await deletePhoto(photo);
		redirect(303, '/retete');
	},

	/** Adaugă rețeta la masa din ziua aleasă; dacă masa nu există încă, o creează. */
	addToPlan: async ({ params, request }) => {
		const recipeId = parseId(params.id);
		if (!recipeId) error(404, 'Rețeta nu există');
		const form = await request.formData();
		const date = dateField(form, 'date');
		const mealType = str(form, 'meal_type', 20);
		const servings = int(form, 'servings', 1, 100, 2);
		if (!date || !isMealType(mealType)) return fail(400, { planError: 'Alege ziua și masa.' });

		const db = getDb();
		const [existing] = await db
			.select({ id: schema.meals.id })
			.from(schema.meals)
			.where(and(eq(schema.meals.date, date), eq(schema.meals.mealType, mealType)))
			.limit(1);
		let mealId = existing?.id;
		if (!mealId) {
			const time = MEAL_TYPES.find((m) => m.id === mealType)?.time || null;
			const [row] = await db.insert(schema.meals).values({ date, mealType, time, servings }).returning({ id: schema.meals.id });
			mealId = row.id;
		}
		await db.insert(schema.mealDishes).values({ mealId, recipeId, position: await nextDishPosition(mealId) });
		redirect(303, `/masa/${mealId}`);
	}
};
