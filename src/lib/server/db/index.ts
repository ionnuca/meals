import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

let client: ReturnType<typeof postgres> | null = null;
let instance: Db | null = null;

export function createDb(url: string, max = 5): { db: Db; close: () => Promise<void> } {
	const c = postgres(url, { max, onnotice: () => {} });
	return { db: drizzle(c, { schema }), close: () => c.end({ timeout: 5 }) };
}

/** Conexiunea aplicației; se deschide la prima folosire. */
export function getDb(): Db {
	if (!instance) {
		const url = process.env.DATABASE_URL;
		if (!url) throw new Error('Lipsește DATABASE_URL (vezi .env.example).');
		client = postgres(url, { max: Number(process.env.DB_POOL_SIZE ?? 5), onnotice: () => {} });
		instance = drizzle(client, { schema });
	}
	return instance;
}

/** Găsește folderul cu migrațiile SQL, atât în dezvoltare cât și în imaginea Docker. */
export function migrationsFolder(): string {
	const candidates = [
		process.env.MIGRATIONS_DIR,
		path.resolve(process.cwd(), 'drizzle'),
		path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../drizzle')
	].filter(Boolean) as string[];
	const found = candidates.find((p) => existsSync(path.join(p, 'meta', '_journal.json')));
	if (!found) throw new Error(`Nu găsesc migrațiile (am căutat în: ${candidates.join(', ')}).`);
	return found;
}

export async function runMigrations(db: Db = getDb()): Promise<void> {
	await migrate(db, { migrationsFolder: migrationsFolder() });
}

export { schema };
