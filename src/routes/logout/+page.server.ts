import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE, clearSessionCookie, invalidateSession } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => redirect(303, '/setari');

export const actions: Actions = {
	default: async ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) await invalidateSession(token);
		clearSessionCookie(cookies);
		redirect(303, '/login');
	}
};
