import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '#lib/server/db/index.ts';
import {
	clearFailures,
	createSession,
	isRateLimited,
	normalizeEmail,
	recordFailure,
	setSessionCookie,
	userCount,
	verifyPassword
} from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

function safeNext(next: string | null): string {
	return next && next.startsWith('/') && !next.startsWith('//') ? next : '/plan';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) redirect(303, safeNext(url.searchParams.get('next')));
	if ((await userCount()) === 0) redirect(303, '/setup');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const form = await request.formData();
		const email = normalizeEmail(String(form.get('email') ?? ''));
		const password = String(form.get('password') ?? '');
		const limitKey = `${getClientAddress()}|${email}`;

		if (isRateLimited(limitKey)) {
			return fail(429, { email, message: 'Prea multe încercări. Încearcă din nou peste 15 minute.' });
		}

		const [user] = await getDb().select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
		const ok = user ? await verifyPassword(password, user.passwordHash) : false;
		if (!user || !ok) {
			recordFailure(limitKey);
			return fail(400, { email, message: 'Email sau parolă greșită.' });
		}

		clearFailures(limitKey);
		const { token, expiresAt } = await createSession(user.id);
		setSessionCookie(cookies, token, expiresAt, url.protocol === 'https:');
		redirect(303, safeNext(url.searchParams.get('next')));
	}
};
