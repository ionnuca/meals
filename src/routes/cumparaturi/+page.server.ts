import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '#lib/server/db/index.ts';
import { periodKey, shoppingNeeds } from '#lib/server/data.ts';
import { aisleField, id as parseId, str } from '#lib/server/forms.ts';
import { ensureProduct, getProduct, listProducts, validUnit } from '#lib/server/products.ts';
import { aggregate } from '#lib/shopping.ts';
import { addDays, daysBetween, isIsoDate, startOfWeek, today } from '#lib/dates.ts';
import { parseQuantity } from '#lib/units.ts';
import type { Actions, PageServerLoad } from './$types';

const MAX_DAYS = 62;

function range(url: URL): { from: string; to: string } {
	const de = url.searchParams.get('de');
	const pana = url.searchParams.get('pana');
	if (isIsoDate(de) && isIsoDate(pana) && daysBetween(de, pana) >= 0 && daysBetween(de, pana) <= MAX_DAYS) {
		return { from: de, to: pana };
	}
	const monday = startOfWeek(today(process.env.APP_TZ));
	return { from: monday, to: addDays(monday, 6) };
}

function periodFromForm(form: FormData): string | null {
	const p = str(form, 'period', 30);
	const [a, b] = p.split('_');
	return isIsoDate(a) && isIsoDate(b) ? p : null;
}

export const load: PageServerLoad = async ({ url }) => {
	const { from, to } = range(url);
	const period = periodKey(from, to);
	const db = getDb();
	const [needs, checks, extras, catalog] = await Promise.all([
		shoppingNeeds(from, to),
		db.select().from(schema.shoppingChecks).where(and(eq(schema.shoppingChecks.period, period), eq(schema.shoppingChecks.checked, true))),
		db.select().from(schema.shoppingExtras).where(eq(schema.shoppingExtras.period, period)),
		listProducts()
	]);
	return { from, to, period, groups: aggregate(needs), checked: checks.map((c) => c.itemKey), extras, catalog };
};

export const actions: Actions = {
	toggle: async ({ request }) => {
		const form = await request.formData();
		const period = periodFromForm(form);
		const key = str(form, 'key', 300);
		const checked = form.get('checked') === 'true';
		if (!period || !key) return fail(400, { message: 'Date invalide.' });
		await getDb()
			.insert(schema.shoppingChecks)
			.values({ period, itemKey: key, checked })
			.onConflictDoUpdate({ target: [schema.shoppingChecks.period, schema.shoppingChecks.itemKey], set: { checked } });
		return { ok: true };
	},

	clearChecks: async ({ request }) => {
		const form = await request.formData();
		const period = periodFromForm(form);
		if (period) await getDb().delete(schema.shoppingChecks).where(eq(schema.shoppingChecks.period, period));
		return { ok: true };
	},

	addExtra: async ({ request }) => {
		const form = await request.formData();
		const period = periodFromForm(form);
		const name = str(form, 'name', 120);
		if (!period || !name) return fail(400, { message: 'Scrie produsul.' });
		const quantity = parseQuantity(form.get('quantity'));
		// produsul vine din catalog; dacă e nou, se adaugă în catalog
		const aisle = aisleField(form.get('aisle'));
		const productId = parseId(form.get('product_id'));
		let product = productId ? await getProduct(productId) : null;
		if (!product || product.name.toLowerCase() !== name.toLowerCase()) {
			product = await ensureProduct({ name, aisle, unit: form.get('unit') as string });
		}
		await getDb()
			.insert(schema.shoppingExtras)
			.values({ period, name: product.name, quantity, unit: validUnit(form.get('unit'), product.unit), aisle: aisle ?? product.aisle });
		return { ok: true };
	},

	removeExtra: async ({ request }) => {
		const form = await request.formData();
		const extraId = parseId(form.get('extra_id'));
		if (extraId) await getDb().delete(schema.shoppingExtras).where(eq(schema.shoppingExtras.id, extraId));
		return { ok: true };
	}
};
