<script lang="ts">
	import Icon from './Icon.svelte';
	import { CATEGORY_TINT, categoryIcon } from '../constants';

	let {
		photo = null,
		category = 'fel_principal',
		size = 56,
		width = undefined,
		radius = 12,
		alt = ''
	}: { photo?: string | null; category?: string; size?: number; width?: string; radius?: number; alt?: string } = $props();

	const tint = $derived(CATEGORY_TINT[category] ?? CATEGORY_TINT.fel_principal);
	const box = $derived(`width:${width ?? `${size}px`};height:${size}px;border-radius:${radius}px`);
</script>

{#if photo}
	<img class="photo" src={`/uploads/${photo}`} {alt} style={box} loading="lazy" decoding="async" />
{:else}
	<div class="photo ph" style={`${box};background:${tint[0]};color:${tint[1]}`} role="img" aria-label={alt || 'fără poză'}>
		<Icon name={categoryIcon(category)} size={Math.round(Math.min(size * 0.45, 48))} stroke={1.6} />
	</div>
{/if}

<style>
	.photo {
		flex-shrink: 0;
		object-fit: cover;
		background: var(--ground);
	}
	.ph {
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
