import { describe, expect, it } from 'vitest';
import { aggregate, toPlainText, type Need } from '../../src/lib/shopping';

const need = (name: string, quantity: number | null, unit: string | null, aisle: string | null, source = 'x'): Need => ({ name, quantity, unit, aisle, source });

describe('agregarea listei de cumpărături', () => {
	it('adună același produs din mai multe rețete, convertind unitățile', () => {
		const groups = aggregate([
			need('Ceapă', 2, 'buc', 'Legume și fructe', 'Ciorbă'),
			need('ceapă ', 1, 'buc', null, 'Sarmale'),
			need('Carne tocată', 0.5, 'kg', 'Carne și pește', 'Sarmale'),
			need('Carne tocată', 300, 'g', 'Carne și pește', 'Perișoare')
		]);
		const legume = groups.find((g) => g.aisle === 'Legume și fructe')!;
		expect(legume.items).toHaveLength(1);
		expect(legume.items[0]).toMatchObject({ name: 'Ceapă', quantity: 3, unit: 'buc', display: '3 buc' });
		expect(legume.items[0].sources).toEqual(['Ciorbă', 'Sarmale']);
		const carne = groups.find((g) => g.aisle === 'Carne și pește')!;
		expect(carne.items[0]).toMatchObject({ quantity: 800, unit: 'g', display: '800 g' });
	});

	it('păstrează separat unitățile incompatibile și produsele fără cantitate', () => {
		const groups = aggregate([
			need('Lapte', 1, 'l', 'Lactate și ouă'),
			need('Lapte', 1, 'cană', 'Lactate și ouă'),
			need('Sare', null, 'după gust', 'Condimente'),
			need('Sare', null, 'după gust', 'Condimente')
		]);
		const lactate = groups.find((g) => g.aisle === 'Lactate și ouă')!;
		expect(lactate.items).toHaveLength(2);
		const cond = groups.find((g) => g.aisle === 'Condimente')!;
		expect(cond.items).toHaveLength(1);
		expect(cond.items[0].display).toBe('după gust');
	});

	it('ordonează raioanele ca în magazin, „Altele” la sfârșit', () => {
		const groups = aggregate([
			need('Detergent', 1, 'buc', null),
			need('Pâine', 1, 'buc', 'Panificație'),
			need('Roșii', 1, 'kg', 'Legume și fructe'),
			need('Vin', 2, 'sticlă', 'Băuturi')
		]);
		expect(groups.map((g) => g.aisle)).toEqual(['Legume și fructe', 'Panificație', 'Băuturi', 'Altele']);
	});

	it('generează text simplu fără produsele bifate', () => {
		const groups = aggregate([need('Roșii', 1, 'kg', 'Legume și fructe'), need('Pâine', 1, 'buc', 'Panificație')]);
		const roșii = groups[0].items[0].key;
		const text = toPlainText('Cumpărături', groups, new Set([roșii]));
		expect(text).toContain('Pâine — 1 buc');
		expect(text).not.toContain('Roșii');
	});
});
