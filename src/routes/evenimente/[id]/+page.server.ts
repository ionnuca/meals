import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { getDb, schema } from '#lib/server/db/index.ts';
import { getEvent, ingredientCatalog, listRecipes } from '#lib/server/data.ts';
import { aisleField, dateField, id as parseId, int, isSection, str, timeField, unitField } from '#lib/server/forms.ts';
import { parseQuantity } from '#lib/units.ts';
import type { Actions, PageServerLoad } from './$types';

async function requireEvent(idParam: string) {
	const eventId = parseId(idParam);
	const ev = eventId ? await getEvent(eventId) : null;
	if (!ev) error(404, 'Evenimentul nu există');
	return ev;
}

async function nextPosition(eventId: number): Promise<number> {
	const [r] = await getDb()
		.select({ n: sql<number>`coalesce(max(${schema.eventItems.position}), -1)::int` })
		.from(schema.eventItems)
		.where(eq(schema.eventItems.eventId, eventId));
	return (r?.n ?? -1) + 1;
}

export const load: PageServerLoad = async ({ params }) => {
	const event = await requireEvent(params.id);
	const recipeIds = [...new Set(event.items.map((i) => i.recipeId).filter((x): x is number => !!x))];
	const ings = recipeIds.length
		? await getDb().select().from(schema.recipeIngredients).where(inArray(schema.recipeIngredients.recipeId, recipeIds))
		: [];
	const raw = event.items.flatMap((it) =>
		it.recipeId
			? ings
					.filter((i) => i.recipeId === it.recipeId)
					.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, aisle: i.aisle, recipeServings: it.recipeServings ?? 1, scale: true, source: it.name }))
			: [{ name: it.name, quantity: it.quantity, unit: it.unit, aisle: it.aisle, recipeServings: 1, scale: false, source: it.name }]
	);
	const [recipes, catalog] = await Promise.all([listRecipes(), ingredientCatalog()]);
	return { event, raw, recipes, catalog };
};

export const actions: Actions = {
	guests: async ({ params, request }) => {
		const ev = await requireEvent(params.id);
		const form = await request.formData();
		await getDb()
			.update(schema.events)
			.set({ guests: int(form, 'guests', 1, 500, ev.guests) })
			.where(eq(schema.events.id, ev.id));
		return { saved: true };
	},

	update: async ({ params, request }) => {
		const ev = await requireEvent(params.id);
		const form = await request.formData();
		const name = str(form, 'name', 120);
		const date = dateField(form, 'date');
		if (!name || !date) return fail(400, { message: 'Numele și data sunt obligatorii.' });
		await getDb()
			.update(schema.events)
			.set({ name, date, time: timeField(form, 'time'), note: str(form, 'note', 1000) || null })
			.where(eq(schema.events.id, ev.id));
		return { saved: true };
	},

	addRecipe: async ({ params, request }) => {
		const ev = await requireEvent(params.id);
		const form = await request.formData();
		const section = str(form, 'section', 20);
		const recipeId = parseId(form.get('recipe_id'));
		if (!isSection(section) || !recipeId) return fail(400, { message: 'Alege secțiunea și rețeta.' });
		await getDb().insert(schema.eventItems).values({ eventId: ev.id, section, recipeId, position: await nextPosition(ev.id) });
		return { added: true };
	},

	addProduct: async ({ params, request }) => {
		const ev = await requireEvent(params.id);
		const form = await request.formData();
		const section = str(form, 'section', 20);
		const name = str(form, 'name', 120);
		if (!isSection(section) || !name) return fail(400, { message: 'Scrie numele produsului.' });
		const quantity = parseQuantity(form.get('quantity'));
		if (String(form.get('quantity') ?? '').trim() && quantity === null) return fail(400, { message: 'Cantitatea nu e un număr valid.' });
		await getDb()
			.insert(schema.eventItems)
			.values({
				eventId: ev.id,
				section,
				name,
				quantity,
				unit: unitField(form.get('unit')),
				aisle: aisleField(form.get('aisle')) ?? (section === 'bauturi' ? 'Băuturi' : null),
				position: await nextPosition(ev.id)
			});
		return { added: true };
	},

	removeItem: async ({ params, request }) => {
		const ev = await requireEvent(params.id);
		const form = await request.formData();
		const itemId = parseId(form.get('item_id'));
		if (itemId) {
			await getDb()
				.delete(schema.eventItems)
				.where(and(eq(schema.eventItems.id, itemId), eq(schema.eventItems.eventId, ev.id)));
		}
		return { removed: true };
	},

	delete: async ({ params }) => {
		const ev = await requireEvent(params.id);
		await getDb().delete(schema.events).where(eq(schema.events.id, ev.id));
		redirect(303, `/calendar?luna=${ev.date.slice(0, 7)}`);
	}
};
