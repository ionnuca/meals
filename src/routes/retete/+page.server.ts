import { listRecipes } from '#lib/server/data.ts';
import { isCategory } from '#lib/server/forms.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
	const cat = url.searchParams.get('categorie') ?? '';
	const category = isCategory(cat) ? cat : '';
	return { q, category, recipes: await listRecipes({ q, category }) };
};
