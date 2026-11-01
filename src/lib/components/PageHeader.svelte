<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let {
		title,
		eyebrow = '',
		back = '',
		actions = undefined
	}: { title: string; eyebrow?: string; back?: string; actions?: Snippet } = $props();
</script>

<header class="ph">
	{#if back}
		<a class="icon-btn" href={back} aria-label="Înapoi"><Icon name="left" size={18} stroke={2} /></a>
	{/if}
	<div class="grow">
		{#if eyebrow}<p class="eyebrow">{eyebrow}</p>{/if}
		<h1>{title}</h1>
	</div>
	{#if actions}<div class="actions">{@render actions()}</div>{/if}
</header>

<style>
	.ph {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 24px 0 16px;
	}
	.actions {
		display: flex;
		gap: 6px;
		flex-shrink: 0;
	}
</style>
