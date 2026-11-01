// Golește baza de test e2e; serverul pornit imediat după rulează migrațiile pe o bază curată.
import postgres from 'postgres';

const sql = postgres(String(process.env.DATABASE_URL), { max: 1, onnotice: () => {} });
await sql.unsafe('drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;');
await sql.end();
