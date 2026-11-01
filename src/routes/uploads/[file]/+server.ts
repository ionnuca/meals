import { error } from '@sveltejs/kit';
import { mimeFor, readPhoto } from '#lib/server/uploads.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const data = await readPhoto(params.file);
	const mime = mimeFor(params.file);
	if (!data || !mime) error(404, 'Poza nu există');
	return new Response(new Uint8Array(data), {
		headers: {
			'content-type': mime,
			// numele e unic (uuid), deci poza nu se schimbă niciodată sub același nume
			'cache-control': 'private, max-age=31536000, immutable'
		}
	});
};
