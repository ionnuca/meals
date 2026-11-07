import { redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { runMigrations } from '#lib/server/db/index.ts';
import {
	SESSION_COOKIE,
	clearSessionCookie,
	deleteExpiredSessions,
	ensureInitialAdmin,
	setSessionCookie,
	validateSession
} from '#lib/server/auth.ts';

export const init: ServerInit = async () => {
	if (process.env.SKIP_MIGRATIONS !== 'true') {
		await runMigrations();
		console.log('[meals] migrațiile bazei de date sunt la zi');
	}
	await deleteExpiredSessions().catch(() => {});
	if ((await ensureInitialAdmin()) === 'created') console.log('[meals] primul cont a fost creat din INITIAL_ADMIN_EMAIL');
};

/** Adrese accesibile fără autentificare. */
const PUBLIC = ['/login', '/setup', '/health', '/manifest.webmanifest', '/service-worker.js', '/favicon', '/icons/', '/robots.txt'];

function isPublic(pathname: string): boolean {
	return pathname.startsWith('/_app/') || PUBLIC.some((p) => pathname === p || pathname.startsWith(p));
}

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = null;

	if (token) {
		const result = await validateSession(token);
		if (result) {
			event.locals.user = result.user;
			if (result.renewed) setSessionCookie(event.cookies, token, result.expiresAt, event.url.protocol === 'https:');
		} else {
			clearSessionCookie(event.cookies);
		}
	}

	if (!event.locals.user && !isPublic(event.url.pathname)) {
		if (event.request.method !== 'GET' || event.url.pathname.startsWith('/api/')) {
			return new Response(JSON.stringify({ message: 'Neautentificat' }), {
				status: 401,
				headers: { 'content-type': 'application/json' }
			});
		}
		const next = event.url.pathname + event.url.search;
		redirect(303, `/login${next && next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`);
	}

	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'same-origin');
	response.headers.set('X-Frame-Options', 'DENY');
	return response;
};
