import { fail, redirect } from '@sveltejs/kit';
import { and, gte, lte, inArray } from 'drizzle-orm';
import { getDb, schema } from '#lib/server/db/index.ts';
import { eventsBetween, mealsBetween } from '#lib/server/data.ts';
import { addDays, isIsoDate, startOfWeek, today, weekDays } from '#lib/dates.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const now = today(process.env.APP_TZ);
	const s = url.searchParams.get('s');
	const monday = startOfWeek(isIsoDate(s) ? s : now);
	const sunday = addDays(monday, 6);
	const [meals, events] = await Promise.all([mealsBetween(monday, sunday), eventsBetween(monday, sunday)]);
	return { monday, sunday, today: now, days: weekDays(monday), meals, events };
};

export const actions: Actions = {
	/** Copiază toate mesele din săptămâna precedentă în săptămâna afișată. */
	copyPrevious: async ({ request }) => {
		const form = await request.formData();
		const monday = String(form.get('monday') ?? '');
		if (!isIsoDate(monday)) return fail(400, { message: 'Săptămână invalidă.' });
		const prevMonday = addDays(monday, -7);
		const db = getDb();
		await db.transaction(async (tx) => {
			const src = await tx
				.select()
				.from(schema.meals)
				.where(and(gte(schema.meals.date, prevMonday), lte(schema.meals.date, addDays(prevMonday, 6))));
			if (!src.length) return;
			const dishes = await tx.select().from(schema.mealDishes).where(inArray(schema.mealDishes.mealId, src.map((m) => m.id)));
			for (const m of src) {
				const [row] = await tx
					.insert(schema.meals)
					.values({ date: addDays(m.date, 7), mealType: m.mealType, time: m.time, servings: m.servings, note: m.note })
					.returning({ id: schema.meals.id });
				const ds = dishes.filter((d) => d.mealId === m.id);
				if (ds.length) await tx.insert(schema.mealDishes).values(ds.map((d) => ({ mealId: row.id, recipeId: d.recipeId, position: d.position })));
			}
		});
		redirect(303, `/plan?s=${monday}`);
	}
};
