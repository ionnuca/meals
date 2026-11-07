import { fail, redirect } from '@sveltejs/kit';
import { getDb, schema } from '#lib/server/db/index.ts';
import { dateField, int, isPast, PAST_MESSAGE, str, timeField, todayLocal } from '#lib/server/forms.ts';
import { isIsoDate } from '#lib/dates.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const d = url.searchParams.get('data');
	const now = todayLocal();
	return { date: isIsoDate(d) && d >= now ? d : now, today: now };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const values = {
			name: str(form, 'name', 120),
			date: dateField(form, 'date'),
			time: timeField(form, 'time'),
			guests: int(form, 'guests', 1, 500, 6),
			note: str(form, 'note', 1000) || null
		};
		if (!values.name) return fail(400, { message: 'Scrie numele evenimentului.', values });
		if (!values.date) return fail(400, { message: 'Alege data.', values });
		if (isPast(values.date)) return fail(400, { message: PAST_MESSAGE, values });
		const [row] = await getDb()
			.insert(schema.events)
			.values({ ...values, date: values.date })
			.returning({ id: schema.events.id });
		redirect(303, `/evenimente/${row.id}`);
	}
};
