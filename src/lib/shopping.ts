// Agregarea listei de cumpărături: aceleași produse din mai multe rețete se adună într-un singur rând.
import { AISLES, DEFAULT_AISLE } from './constants';
import { formatQuantity, normalizeUnit, toBase } from './units';

export interface Need {
	name: string;
	quantity: number | null;
	unit: string | null;
	aisle: string | null;
	/** De unde vine produsul, de ex. „Sarmale · 3 nov” */
	source: string;
}

export interface ShoppingItem {
	key: string;
	name: string;
	quantity: number | null;
	unit: string;
	display: string;
	aisle: string;
	sources: string[];
}

export interface ShoppingGroup {
	aisle: string;
	items: ShoppingItem[];
}

export function normalizeName(name: string): string {
	return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ro-RO');
}

export function itemKey(name: string, unit: string | null): string {
	return `${normalizeName(name)}|${normalizeUnit(unit)}`;
}

export function aggregate(needs: Need[]): ShoppingGroup[] {
	const map = new Map<string, ShoppingItem>();
	for (const n of needs) {
		const name = n.name.trim().replace(/\s+/g, ' ');
		if (!name) continue;
		let quantity: number | null = null;
		let unit = normalizeUnit(n.unit);
		if (n.quantity !== null && Number.isFinite(n.quantity) && n.quantity > 0) {
			const b = toBase(n.quantity, unit);
			quantity = b.quantity;
			unit = b.unit;
		}
		const key = quantity === null ? `${normalizeName(name)}|?` : itemKey(name, unit);
		const existing = map.get(key);
		if (existing) {
			if (quantity !== null) existing.quantity = (existing.quantity ?? 0) + quantity;
			if (!existing.sources.includes(n.source)) existing.sources.push(n.source);
			if (existing.aisle === DEFAULT_AISLE && n.aisle) existing.aisle = n.aisle;
		} else {
			map.set(key, {
				key,
				name: name.charAt(0).toLocaleUpperCase('ro-RO') + name.slice(1),
				quantity,
				unit: quantity === null ? (unit === 'după gust' ? unit : '') : unit,
				display: '',
				aisle: n.aisle?.trim() || DEFAULT_AISLE,
				sources: [n.source]
			});
		}
	}

	const groups = new Map<string, ShoppingItem[]>();
	for (const item of map.values()) {
		item.display = formatQuantity(item.quantity, item.unit);
		const list = groups.get(item.aisle) ?? [];
		list.push(item);
		groups.set(item.aisle, list);
	}

	const order = (a: string) => {
		const i = (AISLES as readonly string[]).indexOf(a);
		return i === -1 ? AISLES.length - 1.5 : i; // raioanele proprii, înainte de „Altele”
	};
	return [...groups.entries()]
		.sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b, 'ro'))
		.map(([aisle, items]) => ({ aisle, items: items.sort((x, y) => x.name.localeCompare(y.name, 'ro')) }));
}

/** Text simplu pentru trimis pe telefon (Telegram, Viber, notițe). */
export function toPlainText(title: string, groups: ShoppingGroup[], checked: Set<string>): string {
	const lines = [title, ''];
	for (const g of groups) {
		const rest = g.items.filter((i) => !checked.has(i.key));
		if (!rest.length) continue;
		lines.push(`${g.aisle}:`);
		for (const i of rest) lines.push(`- ${i.name}${i.display ? ` — ${i.display}` : ''}`);
		lines.push('');
	}
	return lines.join('\n').trim();
}
