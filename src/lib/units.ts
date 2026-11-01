// Unități de măsură: aducere la unitatea de bază, scalare după porții și afișare.

const TO_BASE: Record<string, { unit: string; factor: number }> = {
	g: { unit: 'g', factor: 1 },
	kg: { unit: 'g', factor: 1000 },
	ml: { unit: 'ml', factor: 1 },
	l: { unit: 'ml', factor: 1000 }
};

/** Unități numărabile: rezultatul scalării se rotunjește în sus la jumătate sau la întreg. */
const COUNTABLE = new Set(['buc', 'cățel', 'legătură', 'pachet', 'sticlă']);

export function normalizeUnit(unit: string | null | undefined): string {
	return (unit ?? '').trim().toLowerCase();
}

/** Aduce o cantitate la unitatea de bază (kg → g, l → ml), ca să se poată aduna. */
export function toBase(quantity: number, unit: string): { quantity: number; unit: string } {
	const u = normalizeUnit(unit);
	const conv = TO_BASE[u];
	if (!conv) return { quantity, unit: u };
	return { quantity: quantity * conv.factor, unit: conv.unit };
}

/** Factorul de scalare dintre porțiile dorite și porțiile pentru care e scrisă rețeta. */
export function scaleFactor(wanted: number, base: number): number {
	if (!Number.isFinite(wanted) || !Number.isFinite(base) || base <= 0 || wanted <= 0) return 1;
	return wanted / base;
}

function trimNumber(n: number, decimals: number): string {
	const s = n.toFixed(decimals);
	return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

/** Număr afișat în stil românesc (virgulă zecimală). */
export function formatNumber(n: number, decimals = 2): string {
	return trimNumber(n, decimals).replace('.', ',');
}

/** Rotunjire „de bucătărie”, ca rezultatul să fie ușor de cântărit. */
export function roundForKitchen(quantity: number, unit: string): number {
	const u = normalizeUnit(unit);
	if (COUNTABLE.has(u)) {
		return quantity <= 2 ? Math.ceil(quantity * 2) / 2 : Math.ceil(quantity);
	}
	if (u === 'g' || u === 'ml') {
		if (quantity < 10) return Math.round(quantity);
		if (quantity < 100) return Math.round(quantity / 5) * 5;
		return Math.round(quantity / 10) * 10;
	}
	if (u === 'kg' || u === 'l') return Math.round(quantity * 100) / 100;
	return Math.round(quantity * 4) / 4; // linguri, căni: sferturi
}

/** Afișează o cantitate; g și ml mari devin kg și l. */
export function formatQuantity(quantity: number | null | undefined, unit: string | null | undefined): string {
	const u = normalizeUnit(unit);
	if (quantity === null || quantity === undefined || !Number.isFinite(quantity) || quantity <= 0) {
		return u === 'după gust' ? 'după gust' : '';
	}
	let q = roundForKitchen(quantity, u);
	let shown = u;
	if (u === 'g' && q >= 1000) {
		q = Math.round(q / 10) / 100;
		shown = 'kg';
	} else if (u === 'ml' && q >= 1000) {
		q = Math.round(q / 10) / 100;
		shown = 'l';
	}
	return shown ? `${formatNumber(q)} ${shown}` : formatNumber(q);
}

/** Interpretează o cantitate tastată („1,5”, „0.25”, „1/2”). Gol → null. */
export function parseQuantity(input: unknown): number | null {
	if (input === null || input === undefined) return null;
	const s = String(input).trim().replace(',', '.');
	if (!s) return null;
	const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
	if (frac) {
		const d = Number(frac[2]);
		return d ? Number(frac[1]) / d : null;
	}
	const n = Number(s);
	return Number.isFinite(n) && n >= 0 ? n : null;
}
