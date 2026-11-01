import { sql } from 'drizzle-orm';
import { getDb } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

/** Verificare de sănătate pentru Docker: aplicația răspunde și baza e accesibilă. */
export const GET: RequestHandler = async () => {
	try {
		await getDb().execute(sql`select 1`);
		return new Response('ok', { headers: { 'cache-control': 'no-store' } });
	} catch {
		return new Response('db unavailable', { status: 503 });
	}
};
