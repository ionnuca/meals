import { fail, redirect } from '@sveltejs/kit';
import { getDb, schema } from '#lib/server/db/index.ts';
import {
	createSession,
	hashPassword,
	isEmail,
	normalizeEmail,
	setSessionCookie,
	userCount,
	validatePassword
} from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

/** Prima pornire: se creează primul cont. După aceea pagina nu mai e disponibilă. */
export const load: PageServerLoad = async () => {
	if ((await userCount()) > 0) redirect(303, '/login');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		if ((await userCount()) > 0) redirect(303, '/login');
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const email = normalizeEmail(String(form.get('email') ?? ''));
		const password = String(form.get('password') ?? '');

		if (!name) return fail(400, { name, email, message: 'Scrie numele.' });
		if (!isEmail(email)) return fail(400, { name, email, message: 'Adresa de email nu e validă.' });
		const pwError = validatePassword(password);
		if (pwError) return fail(400, { name, email, message: pwError });

		const [user] = await getDb()
			.insert(schema.users)
			.values({ name, email, passwordHash: await hashPassword(password) })
			.returning({ id: schema.users.id });
		const { token, expiresAt } = await createSession(user.id);
		setSessionCookie(cookies, token, expiresAt, url.protocol === 'https:');
		redirect(303, '/plan');
	}
};
