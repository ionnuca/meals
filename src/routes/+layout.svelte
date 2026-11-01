<script lang="ts">
	import '@fontsource-variable/fraunces';
	import '@fontsource-variable/inter';
	import '../app.css';
	import { page, navigating } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const tabs = [
		{ href: '/plan', label: 'Plan', icon: 'plan', match: ['/plan', '/zi', '/masa'] },
		{ href: '/calendar', label: 'Calendar', icon: 'calendar', match: ['/calendar', '/evenimente'] },
		{ href: '/retete', label: 'Rețete', icon: 'book', match: ['/retete'] },
		{ href: '/cumparaturi', label: 'Cumpărături', icon: 'cart', match: ['/cumparaturi'] }
	] as const;

	const active = (match: readonly string[]) => match.some((m) => page.url.pathname.startsWith(m));
	let online = $state(true);

	$effect(() => {
		online = navigator.onLine;
		const on = () => (online = true);
		const off = () => (online = false);
		window.addEventListener('online', on);
		window.addEventListener('offline', off);
		return () => {
			window.removeEventListener('online', on);
			window.removeEventListener('offline', off);
		};
	});
</script>

<svelte:head>
	<title>Mese</title>
</svelte:head>

{#if navigating.to}<div class="progress" aria-hidden="true"></div>{/if}

{#if !online}
	<div class="offline" role="status">Fără conexiune — vezi ultima versiune salvată</div>
{/if}

<div class="app" class:with-nav={!!data.user}>
	<main>
		{@render children()}
	</main>
</div>

{#if data.user}
	<nav class="tabs" aria-label="Navigare principală">
		{#each tabs as t (t.href)}
			<a href={t.href} class:on={active(t.match)} aria-current={active(t.match) ? 'page' : undefined}>
				<Icon name={t.icon} size={22} />
				<span>{t.label}</span>
			</a>
		{/each}
	</nav>
{/if}

<style>
	.app {
		max-width: 680px;
		margin: 0 auto;
		padding: 0 20px 32px;
		min-height: 100vh;
	}
	.app.with-nav {
		padding-bottom: calc(var(--nav-h) + 32px + env(safe-area-inset-bottom));
	}
	.tabs {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		height: calc(var(--nav-h) + env(safe-area-inset-bottom));
		padding-bottom: env(safe-area-inset-bottom);
		background: rgba(251, 250, 246, 0.96);
		backdrop-filter: blur(8px);
		border-top: 1px solid var(--line);
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		z-index: 20;
	}
	.tabs a {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		font-size: 12px;
		font-weight: 500;
		color: var(--muted);
		text-decoration: none;
	}
	.tabs a.on {
		color: var(--accent);
		font-weight: 600;
	}
	.offline {
		position: sticky;
		top: 0;
		z-index: 30;
		background: var(--event-soft);
		color: var(--event-ink);
		text-align: center;
		font-size: 13px;
		padding: 6px 12px;
	}
	.progress {
		position: fixed;
		top: 0;
		left: 0;
		height: 3px;
		width: 100%;
		background: var(--accent);
		transform-origin: left;
		animation: grow 1.2s ease-out infinite;
		z-index: 40;
	}
	@keyframes grow {
		from { transform: scaleX(0); }
		to { transform: scaleX(1); }
	}
</style>
