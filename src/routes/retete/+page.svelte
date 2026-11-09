<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Photo from '#lib/components/Photo.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { RECIPE_CATEGORIES, categoryLabel } from '#lib/constants.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const link = (cat: string) => {
		const p = new URLSearchParams();
		if (data.q) p.set('q', data.q);
		if (cat) p.set('categorie', cat);
		const s = p.toString();
		return s ? `/retete?${s}` : '/retete';
	};
</script>

<svelte:head><title>Rețete · Mese</title></svelte:head>

<PageHeader title="Rețete" eyebrow={`${data.recipes.length} în colecție`}>
	{#snippet actions()}
		<a class="btn small secondary" href="/produse"><Icon name="cart" size={16} />Produse</a>
		<a class="btn small" href="/retete/nou"><Icon name="plus" size={16} stroke={2.2} />Rețetă</a>
	{/snippet}
</PageHeader>

<form method="GET" class="search" role="search">
	<Icon name="search" size={18} />
	<input type="search" name="q" defaultValue={data.q} placeholder="Caută o rețetă" aria-label="Caută o rețetă" />
	{#if data.category}<input type="hidden" name="categorie" value={data.category} />{/if}
</form>

<div class="chips" aria-label="Categorii">
	<a href={link('')} class="chip" class:on={!data.category}>Toate</a>
	{#each RECIPE_CATEGORIES as c (c.id)}
		<a href={link(c.id)} class="chip" class:on={data.category === c.id}>{c.label}</a>
	{/each}
</div>

{#if data.recipes.length}
	<ul class="grid">
		{#each data.recipes as r (r.id)}
			<li>
				<a href={`/retete/${r.id}`} class="tile">
					<Photo photo={r.photo} category={r.category} size={120} width="100%" radius={14} alt={r.name} />
					<span class="name">{r.name}</span>
					<span class="small muted">{categoryLabel(r.category)}{r.prepMinutes ? ` · ${r.prepMinutes} min` : ''}</span>
				</a>
			</li>
		{/each}
	</ul>
{:else}
	<div class="empty">
		{#if data.q || data.category}Nicio rețetă găsită.{:else}Încă nu ai rețete. Începe cu una pe care o gătești des.{/if}
		<div style="margin-top:12px"><a class="btn" href="/retete/nou">Adaugă o rețetă</a></div>
	</div>
{/if}

<style>
	.search {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--card);
		border: 1px solid var(--line-strong);
		border-radius: 22px;
		padding: 0 14px;
		color: var(--muted);
	}
	.search input {
		border: none;
		background: transparent;
		padding-left: 0;
	}
	.search input:focus {
		outline: none;
	}
	.search:focus-within {
		outline: 2px solid var(--accent);
	}
	.chips {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		padding: 14px 0;
		scrollbar-width: none;
	}
	.chip {
		flex-shrink: 0;
		height: 36px;
		padding: 0 14px;
		border-radius: 18px;
		border: 1px solid var(--line-strong);
		display: inline-flex;
		align-items: center;
		font-size: 13px;
		font-weight: 500;
		color: var(--ink);
		text-decoration: none;
		background: var(--card);
	}
	.chip.on {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
	}
	.grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 16px 12px;
	}
	.tile {
		display: flex;
		flex-direction: column;
		gap: 4px;
		text-decoration: none;
		color: var(--ink);
	}
	.name {
		font-family: var(--serif);
		font-size: 16px;
		font-weight: 500;
		line-height: 1.25;
		margin-top: 4px;
	}
</style>
