import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
			},
			adapter: adapter({ out: 'build' }),
			// În producție (în spatele Caddy) originea se deduce din antetul Host, cu https.
			// Pentru rulările locale pe http sunt permise explicit adresele de pe localhost.
			csrf: {
				trustedOrigins: ['http://localhost:3000', 'http://localhost:4173', 'http://127.0.0.1:3000', 'http://127.0.0.1:4173']
			}
		})
	]
});
