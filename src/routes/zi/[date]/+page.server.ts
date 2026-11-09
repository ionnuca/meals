import { error, fail, redirect } from '@sveltejs/kit';
import { getDb, schema } from '#lib/server/db/index.ts';
import { eventsBetween, mealsBetween } from '#lib/server/data.ts';
import { int, isMealType, isPast, PAST_MESSAGE, str, timeField, todayLocal } from '#lib/server/forms.ts';
import { isIsoDate, startOfWeek, weekDays } from '#lib/dates.ts';
import { MEAL_TYPES } from '#lib/constants.ts';
import { getMealDefaults } from '#lib/server/settings.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	if (!isIsoDate(params.date)) error(404, 'Data nu e validă');
	const [meals, events] = await Promise.all([mealsBetween(params.date, params.date), eventsBetween(params.date, params.date)]);
	return {
		date: params.date,
		today: todayLocal(),
		past: isPast(params.date),
		mealDefaults: await getMealDefaults(),
		week: weekDays(startOfWeek(params.date)),
		meals,
		events
	};
};

export const actions: Actions = {
	addMeal: async ({ params, request }) => {
		if (!isIsoDate(params.date)) error(404, 'Data nu e validă');
		if (isPast(params.date)) return fail(400, { message: PAST_MESSAGE });
		const form = await request.formData();
		const mealType = str(form, 'meal_type', 20);
		if (!isMealType(mealType)) return fail(400, { message: 'Alege tipul mesei.' });
		const time = timeField(form, 'time') ?? (MEAL_TYPES.find((m) => m.id === mealType)?.time || null);
		const servings = int(form, 'servings', 1, 100, 2);
		const note = str(form, 'note', 200) || null;
		const [row] = await getDb()
			.insert(schema.meals)
			.values({ date: params.date, mealType, time, servings, note })
			.returning({ id: schema.meals.id });
		redirect(303, `/masa/${row.id}`);
	}
};
