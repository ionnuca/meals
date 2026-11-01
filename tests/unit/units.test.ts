import { describe, expect, it } from 'vitest';
import { formatQuantity, parseQuantity, roundForKitchen, scaleFactor, toBase } from '../../src/lib/units';

describe('unități', () => {
	it('aduce kg și l la g și ml', () => {
		expect(toBase(1.5, 'kg')).toEqual({ quantity: 1500, unit: 'g' });
		expect(toBase(2, 'L')).toEqual({ quantity: 2000, unit: 'ml' });
		expect(toBase(3, 'buc')).toEqual({ quantity: 3, unit: 'buc' });
	});

	it('calculează factorul de scalare și îl protejează de valori absurde', () => {
		expect(scaleFactor(6, 4)).toBe(1.5);
		expect(scaleFactor(2, 0)).toBe(1);
		expect(scaleFactor(-1, 4)).toBe(1);
	});

	it('rotunjește ca în bucătărie', () => {
		expect(roundForKitchen(347, 'g')).toBe(350);
		expect(roundForKitchen(43, 'g')).toBe(45);
		expect(roundForKitchen(1.2, 'buc')).toBe(1.5);
		expect(roundForKitchen(2.2, 'buc')).toBe(3);
		expect(roundForKitchen(0.6, 'lingură')).toBe(0.5);
	});

	it('afișează cantitățile frumos', () => {
		expect(formatQuantity(1750, 'g')).toBe('1,75 kg');
		expect(formatQuantity(1200, 'ml')).toBe('1,2 l');
		expect(formatQuantity(250, 'g')).toBe('250 g');
		expect(formatQuantity(1.5, 'buc')).toBe('1,5 buc');
		expect(formatQuantity(null, 'după gust')).toBe('după gust');
		expect(formatQuantity(null, 'g')).toBe('');
	});

	it('înțelege cantitățile tastate', () => {
		expect(parseQuantity('1,5')).toBe(1.5);
		expect(parseQuantity('1/2')).toBe(0.5);
		expect(parseQuantity(' 250 ')).toBe(250);
		expect(parseQuantity('')).toBeNull();
		expect(parseQuantity('abc')).toBeNull();
		expect(parseQuantity('-3')).toBeNull();
	});
});
