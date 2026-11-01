import { and, gte, lte } from 'drizzle-orm';
import { getDb, schema } from '#lib/server/db/index.ts';
import { eventsBetween } from '#lib/server/data.ts';
import { isMonthKey, monthGrid, monthKey, today } from '#lib/dates.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const now = today(process.env.APP_TZ);
	const m = url.searchParams.get('luna');
	const month = isMonthKey(m) ? m : monthKey(now);
	const cells = monthGrid(month);
	const days = cells.filter((c): c is string => !!c);
	const from = days[0];
	const to = days[days.length - 1];
	const [planned, events] = await Promise.all([
		getDb()
			.selectDistinct({ date: schema.meals.date })
			.from(schema.meals)
			.where(and(gte(schema.meals.date, from), lte(schema.meals.date, to))),
		eventsBetween(from, to)
	]);
	return { month, today: now, cells, planned: planned.map((p) => p.date), events };
};
