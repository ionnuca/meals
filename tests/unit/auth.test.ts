import { describe, expect, it } from 'vitest';
import { hashPassword, validatePassword, verifyPassword } from '../../src/lib/server/auth';

describe('parole', () => {
	it('verifică parola corectă și o respinge pe cea greșită', async () => {
		const hash = await hashPassword('o parolă lungă și bună');
		expect(hash.startsWith('scrypt$')).toBe(true);
		expect(await verifyPassword('o parolă lungă și bună', hash)).toBe(true);
		expect(await verifyPassword('altă parolă', hash)).toBe(false);
		expect(await verifyPassword('x', 'format-necunoscut')).toBe(false);
	});

	it('cere minim 10 caractere', () => {
		expect(validatePassword('scurtă')).not.toBeNull();
		expect(validatePassword('suficient de lungă')).toBeNull();
	});
});
