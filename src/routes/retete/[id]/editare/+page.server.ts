import { error, fail, redirect } from '@sveltejs/kit';
import { getRecipe, ingredientCatalog, updateRecipe } from '#lib/server/data.ts';
import { id as parseId, parseRecipeForm } from '#lib/server/forms.ts';
import { deletePhoto, savePhoto } from '#lib/server/uploads.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const recipeId = parseId(params.id);
	const recipe = recipeId ? await getRecipe(recipeId) : null;
	if (!recipe) error(404, 'Rețeta nu există');
	return { recipe, catalog: await ingredientCatalog() };
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		const recipeId = parseId(params.id);
		const existing = recipeId ? await getRecipe(recipeId) : null;
		if (!existing) error(404, 'Rețeta nu există');

		const form = await request.formData();
		const parsed = parseRecipeForm(form);
		if ('error' in parsed) return fail(400, { error: parsed.error, values: { ...parsed.data, photo: existing.photo } });

		let photo: string | null | undefined = undefined;
		const file = form.get('photo');
		if (file instanceof File && file.size > 0) {
			const saved = await savePhoto(file);
			if ('error' in saved) return fail(400, { error: saved.error, values: { ...parsed.data, photo: existing.photo } });
			photo = saved.name;
		} else if (form.get('remove_photo')) {
			photo = null;
		}

		await updateRecipe(existing.id, parsed.data, photo);
		if (photo !== undefined && existing.photo) await deletePhoto(existing.photo);
		redirect(303, `/retete/${existing.id}`);
	}
};
