import { describe, expect, it } from 'vitest';
import { addDays, addMonths, formatDayLong, formatRange, isIsoDate, monthGrid, startOfWeek, weekdayIndex } from '../../src/lib/dates';

describe('date', () => {
	it('găsește lunea săptămânii', () => {
		expect(startOfWeek('2026-11-01')).toBe('2026-10-26'); // duminică
		expect(startOfWeek('2026-11-02')).toBe('2026-11-02'); // luni
		expect(weekdayIndex('2026-11-08')).toBe(6);
	});

	it('trece corect peste lună, an și ora de vară', () => {
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
		expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
		expect(addMonths('2026-12', 1)).toBe('2027-01');
		expect(addMonths('2026-01', -1)).toBe('2025-12');
	});

	it('validează datele', () => {
		expect(isIsoDate('2026-02-29')).toBe(false);
		expect(isIsoDate('2028-02-29')).toBe(true);
		expect(isIsoDate('2026-1-1')).toBe(false);
	});

	it('construiește grila lunii începând cu luni', () => {
		const grid = monthGrid('2026-11');
		expect(grid.length % 7).toBe(0);
		expect(grid.slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-11-01']);
		expect(grid.filter(Boolean)).toHaveLength(30);
	});

	it('formatează în română', () => {
		expect(formatDayLong('2026-11-03')).toBe('Marți, 3 noiembrie');
		expect(formatRange('2026-11-02', '2026-11-08')).toBe('2 – 8 noiembrie');
		expect(formatRange('2026-10-26', '2026-11-01')).toBe('26 oct – 1 nov');
	});
});
