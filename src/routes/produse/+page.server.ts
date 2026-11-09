import { fail } from '@sveltejs/kit';
import { createProduct, deleteProduct, listProductsWithUsage, updateProduct } from '#lib/server/products.ts';
import { id as parseId, str } from '#lib/server/forms.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ products: await listProductsWithUsage() });

function read(form: FormData) {
	return { name: str(form, 'name', 120), aisle: str(form, 'aisle', 60), unit: str(form, 'unit', 30) };
}

export const actions: Actions = {
	create: async ({ request }) => {
		const values = read(await request.formData());
		const result = await createProduct(values);
		if ('error' in result) return fail(400, { createError: result.error, values });
		return { created: result.name };
	},

	update: async ({ request }) => {
		const form = await request.formData();
		const productId = parseId(form.get('id'));
		if (!productId) return fail(400, { rowError: 'Produs invalid.', rowId: null });
		const result = await updateProduct(productId, read(form));
		if ('error' in result) return fail(400, { rowError: result.error, rowId: productId });
		return { updated: result.name };
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		const productId = parseId(form.get('id'));
		if (!productId) return fail(400, { rowError: 'Produs invalid.', rowId: null });
		const result = await deleteProduct(productId);
		if ('error' in result) return fail(400, { rowError: result.error, rowId: productId });
		return { deleted: true };
	}
};
