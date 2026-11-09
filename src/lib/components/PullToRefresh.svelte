<script lang="ts">
	// Reîmprospătare prin tragere în jos (gestul de pe telefon), și în aplicația instalată ca PWA,
	// unde browserul nu oferă gestul. Reîncarcă datele paginii (nu toată pagina) și caută o versiune nouă a aplicației.
	import { invalidateAll } from '$app/navigation';
	import Icon from './Icon.svelte';

	const THRESHOLD = 70; // px de tragere (după rezistență) necesari pentru reîmprospătare
	const MAX = 110;

	let pull = $state(0);
	let refreshing = $state(false);
	let message = $state('');

	let startY = 0;
	let startX = 0;
	let tracking = false;
	let active = $state(false);

	/** Gestul pornește doar de sus de tot și nu din elemente care se derulează singure (liste, câmpuri). */
	function canStart(target: EventTarget | null): boolean {
		if (window.scrollY > 0 || refreshing) return false;
		let el = target instanceof Element ? target : null;
		while (el && el !== document.body) {
			if (el.matches('input, textarea, select, [role="listbox"], [data-no-pull]')) return false;
			if (el.scrollTop > 0) return false;
			el = el.parentElement;
		}
		return true;
	}

	function onStart(e: TouchEvent) {
		if (e.touches.length !== 1 || !canStart(e.target)) return;
		startY = e.touches[0].clientY;
		startX = e.touches[0].clientX;
		tracking = true;
		active = false;
	}

	function onMove(e: TouchEvent) {
		if (!tracking) return;
		const dy = e.touches[0].clientY - startY;
		const dx = e.touches[0].clientX - startX;
		if (!active) {
			// derulare orizontală sau în sus: nu e gestul nostru
			if (Math.abs(dx) > Math.abs(dy) || dy <= 0 || window.scrollY > 0) {
				if (Math.abs(dy) > 8 || Math.abs(dx) > 8) tracking = false;
				return;
			}
			if (dy < 8) return;
			active = true;
		}
		e.preventDefault();
		pull = Math.min(MAX, Math.max(0, (dy - 8) * 0.5));
	}

	async function onEnd() {
		if (!tracking) return;
		tracking = false;
		if (!active) return;
		active = false;
		if (pull >= THRESHOLD) await refresh();
		else pull = 0;
	}

	async function refresh() {
		refreshing = true;
		pull = THRESHOLD;
		message = '';
		try {
			navigator.serviceWorker?.getRegistration().then((r) => r?.update()).catch(() => {});
			await invalidateAll();
			if (!navigator.onLine) message = 'Fără conexiune';
		} catch {
			message = 'Nu s-a putut reîmprospăta';
		} finally {
			refreshing = false;
			pull = 0;
			if (message) setTimeout(() => (message = ''), 2500);
		}
	}

	$effect(() => {
		const opts = { passive: false } as const;
		document.addEventListener('touchstart', onStart, { passive: true });
		document.addEventListener('touchmove', onMove, opts);
		document.addEventListener('touchend', onEnd);
		document.addEventListener('touchcancel', onEnd);
		return () => {
			document.removeEventListener('touchstart', onStart);
			document.removeEventListener('touchmove', onMove);
			document.removeEventListener('touchend', onEnd);
			document.removeEventListener('touchcancel', onEnd);
		};
	});

</script>

<div
	class="ptr"
	class:visible={pull > 0 || refreshing}
	class:animate={!active}
	style={`transform: translate(-50%, ${pull - 52}px)`}
	aria-hidden="true"
>
	<span class="circle" class:spin={refreshing} style={refreshing ? '' : `transform: rotate(${pull * 3}deg)`}>
		<Icon name="refresh" size={20} stroke={2.2} />
	</span>
</div>
{#if refreshing}<span class="visually-hidden" role="status">Se reîmprospătează</span>{/if}

{#if message}<div class="toast" role="status">{message}</div>{/if}

<style>
	.ptr {
		position: fixed;
		top: 0;
		left: 50%;
		z-index: 50;
		pointer-events: none;
		opacity: 0;
	}
	.ptr.visible {
		opacity: 1;
	}
	.ptr.animate {
		transition: transform 0.2s ease, opacity 0.2s;
	}
	.circle {
		width: 40px;
		height: 40px;
		border-radius: 20px;
		background: var(--card);
		color: var(--accent);
		box-shadow: 0 4px 14px rgba(34, 38, 31, 0.18);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.spin {
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.toast {
		position: fixed;
		top: 12px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 50;
		background: var(--ink);
		color: #fff;
		font-size: 13px;
		padding: 8px 14px;
		border-radius: 18px;
	}
	@media (prefers-reduced-motion: reduce) {
		.spin {
			animation: none;
		}
	}
</style>
