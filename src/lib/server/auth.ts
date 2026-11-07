import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { eq, lt, count } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { getDb, schema } from './db';

const { users, sessions } = schema;

export const SESSION_COOKIE = 'meals_session';
const SESSION_DAYS = 30;
const RENEW_WHEN_DAYS_LEFT = 15;

// ---------- Parole (scrypt din Node, fără dependențe externe) ----------

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function scryptAsync(password: string, salt: Buffer, opts = SCRYPT): Promise<Buffer> {
	return new Promise((resolve, reject) =>
		scrypt(password.normalize('NFKC'), salt, opts.keylen, { N: opts.N, r: opts.r, p: opts.p, maxmem: 64 * 1024 * 1024 }, (err, key) =>
			err ? reject(err) : resolve(key)
		)
	);
}

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const key = await scryptAsync(password, salt);
	return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const parts = stored.split('$');
	if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
	const [, N, r, p, saltB64, keyB64] = parts;
	const expected = Buffer.from(keyB64, 'base64');
	const key = await scryptAsync(password, Buffer.from(saltB64, 'base64'), {
		N: Number(N), r: Number(r), p: Number(p), keylen: expected.length
	});
	return key.length === expected.length && timingSafeEqual(key, expected);
}

export function validatePassword(password: string): string | null {
	if (password.length < 10) return 'Parola trebuie să aibă cel puțin 10 caractere.';
	if (password.length > 200) return 'Parola e prea lungă.';
	return null;
}

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function isEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;
}

// ---------- Sesiuni ----------

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: number): Promise<{ token: string; expiresAt: Date }> {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
	await getDb().insert(sessions).values({ id: hashToken(token), userId, expiresAt });
	return { token, expiresAt };
}

export interface SessionUser {
	id: number;
	email: string;
	name: string;
}

export async function validateSession(
	token: string
): Promise<{ user: SessionUser; expiresAt: Date; renewed: boolean } | null> {
	const db = getDb();
	const id = hashToken(token);
	const rows = await db
		.select({ id: users.id, email: users.email, name: users.name, expiresAt: sessions.expiresAt })
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(eq(sessions.id, id))
		.limit(1);
	const row = rows[0];
	if (!row) return null;
	if (row.expiresAt.getTime() <= Date.now()) {
		await db.delete(sessions).where(eq(sessions.id, id));
		return null;
	}
	let expiresAt = row.expiresAt;
	let renewed = false;
	if (expiresAt.getTime() - Date.now() < RENEW_WHEN_DAYS_LEFT * 86_400_000) {
		expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
		await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
		renewed = true;
	}
	return { user: { id: row.id, email: row.email, name: row.name }, expiresAt, renewed };
}

export async function invalidateSession(token: string): Promise<void> {
	await getDb().delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function invalidateUserSessions(userId: number): Promise<void> {
	await getDb().delete(sessions).where(eq(sessions.userId, userId));
}

export async function deleteExpiredSessions(): Promise<void> {
	await getDb().delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date, secure: boolean): void {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		expires: expiresAt
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function userCount(): Promise<number> {
	const [row] = await getDb().select({ n: count() }).from(users);
	return Number(row?.n ?? 0);
}

// ---------- Limitarea încercărilor de autentificare (în memorie, suficient pentru câțiva utilizatori) ----------

const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60_000;

export function isRateLimited(key: string): boolean {
	const a = attempts.get(key);
	if (!a) return false;
	if (a.until < Date.now()) {
		attempts.delete(key);
		return false;
	}
	return a.count >= MAX_ATTEMPTS;
}

export function recordFailure(key: string): void {
	const a = attempts.get(key);
	if (!a || a.until < Date.now()) attempts.set(key, { count: 1, until: Date.now() + WINDOW_MS });
	else a.count++;
}

export function clearFailures(key: string): void {
	attempts.delete(key);
}

// ---------- Primul cont, creat automat la instalare ----------

/**
 * Dacă baza nu are niciun utilizator și sunt setate INITIAL_ADMIN_EMAIL și INITIAL_ADMIN_PASSWORD,
 * creează primul cont. Așa pagina /setup nu rămâne deschisă după o instalare automată.
 */
export async function ensureInitialAdmin(env: Record<string, string | undefined> = process.env): Promise<'created' | 'exists' | 'skipped'> {
	const email = normalizeEmail(env.INITIAL_ADMIN_EMAIL ?? '');
	const password = env.INITIAL_ADMIN_PASSWORD ?? '';
	if (!email || !password) return 'skipped';
	if ((await userCount()) > 0) return 'exists';
	if (!isEmail(email)) throw new Error('INITIAL_ADMIN_EMAIL nu e o adresă validă.');
	const problem = validatePassword(password);
	if (problem) throw new Error(`INITIAL_ADMIN_PASSWORD: ${problem}`);
	await getDb()
		.insert(users)
		.values({ email, name: (env.INITIAL_ADMIN_NAME ?? '').trim() || 'Administrator', passwordHash: await hashPassword(password) })
		.onConflictDoNothing();
	return 'created';
}
