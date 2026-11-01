import { fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '#lib/server/db/index.ts';
import { hashPassword, invalidateUserSessions, isEmail, normalizeEmail, validatePassword, verifyPassword } from '#lib/server/auth.ts';
import { id as parseId, str } from '#lib/server/forms.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	users: await getDb()
		.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
		.from(schema.users)
		.orderBy(asc(schema.users.id))
});

export const actions: Actions = {
	addUser: async ({ request }) => {
		const form = await request.formData();
		const name = str(form, 'name', 80);
		const email = normalizeEmail(str(form, 'email', 200));
		const password = String(form.get('password') ?? '');
		if (!name || !isEmail(email)) return fail(400, { addError: 'Completează numele și un email valid.' });
		const pw = validatePassword(password);
		if (pw) return fail(400, { addError: pw });
		const db = getDb();
		const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));
		if (exists) return fail(400, { addError: 'Există deja un cont cu acest email.' });
		await db.insert(schema.users).values({ name, email, passwordHash: await hashPassword(password) });
		return { addOk: `Contul pentru ${name} a fost creat.` };
	},

	password: async ({ request, locals }) => {
		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		const db = getDb();
		const [me] = await db.select().from(schema.users).where(eq(schema.users.id, locals.user!.id));
		if (!me || !(await verifyPassword(current, me.passwordHash))) return fail(400, { pwError: 'Parola actuală nu e corectă.' });
		const pw = validatePassword(next);
		if (pw) return fail(400, { pwError: pw });
		await db.update(schema.users).set({ passwordHash: await hashPassword(next) }).where(eq(schema.users.id, me.id));
		return { pwOk: 'Parola a fost schimbată.' };
	},

	removeUser: async ({ request, locals }) => {
		const form = await request.formData();
		const userId = parseId(form.get('user_id'));
		if (!userId || userId === locals.user!.id) return fail(400, { addError: 'Nu îți poți șterge propriul cont.' });
		await invalidateUserSessions(userId);
		await getDb().delete(schema.users).where(eq(schema.users.id, userId));
		return { addOk: 'Contul a fost șters.' };
	}
};
