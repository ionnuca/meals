// Service worker: păstrează aplicația și ultimele pagini vizitate, ca lista de cumpărături să se deschidă și fără semnal.
import { self } from '$app/service-worker';
import { immutable, assets } from '$app/manifest';
import { version } from '$app/env';

const sw = self as unknown as ServiceWorkerGlobalScope;
const STATIC = `static-${version}`;
const PAGES = 'pages-v1';
const PHOTOS = 'photos-v1';

const precache = [...immutable.map((f) => f.path), ...assets.map((f) => f.path)].map((p) => `/${p.replace(/^\/+/, '')}`);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(STATIC)
			.then((c) => c.addAll(precache))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k.startsWith('static-') && k !== STATIC).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('message', (event) => {
	// la ieșirea din cont se șterg paginile salvate
	if (event.data === 'clear-pages') event.waitUntil(caches.delete(PAGES));
});

sw.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== sw.location.origin) return;

	// Fișierele aplicației (cu hash în nume) și cele din /static: din cache, cu rezervă din rețea.
	if (precache.includes(url.pathname)) {
		event.respondWith(caches.match(url.pathname).then((r) => r ?? fetch(req)));
		return;
	}

	// Pozele rețetelor nu se schimbă niciodată sub același nume: cache întâi.
	if (url.pathname.startsWith('/uploads/')) {
		event.respondWith(
			caches.open(PHOTOS).then(async (cache) => {
				const hit = await cache.match(req);
				if (hit) return hit;
				const res = await fetch(req);
				if (res.ok) cache.put(req, res.clone());
				return res;
			})
		);
		return;
	}

	if (url.pathname === '/login' || url.pathname === '/logout' || url.pathname === '/setup') return;

	// Pagini și datele lor: rețea întâi; dacă nu e conexiune, ultima versiune salvată.
	const isPage = req.mode === 'navigate' || url.pathname.endsWith('/__data.json') || url.searchParams.has('x-sveltekit-invalidated');
	if (isPage) {
		event.respondWith(
			(async () => {
				const cache = await caches.open(PAGES);
				try {
					const res = await fetch(req);
					if (res.ok && !res.redirected && res.type === 'basic') cache.put(req, res.clone());
					return res;
				} catch (err) {
					const hit = await cache.match(req);
					if (hit) return hit;
					throw err;
				}
			})()
		);
	}
});
