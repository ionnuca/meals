import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export function uploadDir(): string {
	return path.resolve(process.env.UPLOAD_DIR ?? 'data/uploads');
}

const TYPES: { ext: string; mime: string; test: (b: Buffer) => boolean }[] = [
	{ ext: 'jpg', mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
	{ ext: 'png', mime: 'image/png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
	{ ext: 'webp', mime: 'image/webp', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' }
];

export function mimeFor(file: string): string | null {
	const ext = path.extname(file).slice(1).toLowerCase();
	return TYPES.find((t) => t.ext === ext)?.mime ?? null;
}

/** Numele fișierelor salvate de aplicație: uuid + extensie. Orice altceva e respins. */
export function isSafeName(file: string): boolean {
	return /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(file);
}

/** Salvează poza dacă e JPEG, PNG sau WebP real (după conținut, nu după nume). */
export async function savePhoto(file: File): Promise<{ name: string } | { error: string }> {
	if (file.size === 0) return { error: 'Fișierul e gol.' };
	if (file.size > MAX_PHOTO_BYTES) return { error: 'Poza e prea mare (maxim 8 MB).' };
	const buf = Buffer.from(await file.arrayBuffer());
	const type = TYPES.find((t) => t.test(buf));
	if (!type) return { error: 'Sunt acceptate doar poze JPEG, PNG sau WebP.' };
	const dir = uploadDir();
	await mkdir(dir, { recursive: true });
	const name = `${randomUUID()}.${type.ext}`;
	await writeFile(path.join(dir, name), buf);
	return { name };
}

export async function readPhoto(name: string): Promise<Buffer | null> {
	if (!isSafeName(name)) return null;
	try {
		return await readFile(path.join(uploadDir(), name));
	} catch {
		return null;
	}
}

export async function deletePhoto(name: string | null | undefined): Promise<void> {
	if (!name || !isSafeName(name)) return;
	await unlink(path.join(uploadDir(), name)).catch(() => {});
}
