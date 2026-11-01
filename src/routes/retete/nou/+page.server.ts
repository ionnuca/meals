import { fail, redirect } from '@sveltejs/kit';
import { createRecipe, ingredientCatalog } from '#lib/server/data.ts';
import { parseRecipeForm } from '#lib/server/forms.ts';
import { savePhoto } from '#lib/server/uploads.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ catalog: await ingredientCatalog() });

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const parsed = parseRecipeForm(form);
		if ('error' in parsed) return fail(400, { error: parsed.error, values: parsed.data });

		let photo: string | null = null;
		const file = form.get('photo');
		if (file instanceof File && file.size > 0) {
			const saved = await savePhoto(file);
			if ('error' in saved) return fail(400, { error: saved.error, values: parsed.data });
			photo = saved.name;
		}
		const id = await createRecipe(parsed.data, photo);
		redirect(303, `/retete/${id}`);
	}
};
