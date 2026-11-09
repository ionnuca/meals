<script lang="ts">
	// Alegerea unei rețete, grupată pe categorii. Pornește de la categoriile potrivite mesei
	// (de ex. la micul dejun: mic dejun, patiserie, gustări, băuturi); celelalte sunt la un clic.
	// Fiecare rând e desenat de pagina care folosește componenta (snippet-ul `item`).
	import type { Snippet } from 'svelte';
	import { RECIPE_CATEGORIES, categoryLabel } from '../constants';

	type Recipe = { id: number; name: string; category: string; servings: number; photo: string | null };

	let {
		recipes,
		suggested = [],
		suggestedLabel = 'Potrivite',
		item
	}: { recipes: Recipe[]; suggested?: string[]; suggestedLabel?: string; item: Snippet<[Recipe]> } = $props();

	const fold = (s: string) => s.toLocaleLowerCase('ro-RO').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

	const hasSuggested = $derived(suggested.length > 0 && recipes.some((r) => suggested.includes(r.category)));
	// filtrul: 'potrivite', 'toate' sau o categorie
	// svelte-ignore state_referenced_locally
	let filter = $state(suggested.length > 0 && recipes.some((r) => suggested.includes(r.category)) ? 'potrivite' : 'toate');
	let q = $state('');

	/** Categoriile în ordinea afișării: întâi cele potrivite, apoi restul. */
	const order = $derived([...suggested, ...RECIPE_CATEGORIES.map((c) => c.id).filter((c) => !suggested.includes(c))]);
	const present = $derived(order.filter((c) => recipes.some((r) => r.category === c)));

	const groups = $derived.by(() => {
		const query = fold(q);
		// la căutare se caută în toate categoriile
		const cats = query ? present : filter === 'potrivite' ? present.filter((c) => suggested.includes(c)) : filter === 'toate' ? present : [filter];
		return cats
			.map((c) => ({
				category: c,
				items: recipes.filter((r) => r.category === c && (!query || fold(r.name).includes(query)))
			}))
			.filter((g) => g.items.length);
	});
</script>

<input type="search" placeholder="Caută în toate rețetele…" bind:value={q} aria-label="Caută rețeta" />

{#if recipes.length === 0}
	<p class="small muted">Nu ai încă rețete. <a href="/retete/nou">Adaugă una</a>.</p>
{:else}
	{#if !q.trim()}
		<div class="chips" role="group" aria-label="Categorii de rețete">
			{#if hasSuggested}
				<button type="button" class="chip" class:on={filter === 'potrivite'} aria-pressed={filter === 'potrivite'} onclick={() => (filter = 'potrivite')}>{suggestedLabel}</button>
			{/if}
			<button type="button" class="chip" class:on={filter === 'toate'} aria-pressed={filter === 'toate'} onclick={() => (filter = 'toate')}>Toate</button>
			{#each present as c (c)}
				<button type="button" class="chip" class:on={filter === c} aria-pressed={filter === c} onclick={() => (filter = c)}>{categoryLabel(c)}</button>
			{/each}
		</div>
	{/if}

	<div class="options">
		{#each groups as g (g.category)}
			<p class="group-title">{categoryLabel(g.category)} <span class="count">{g.items.length}</span></p>
			<ul>
				{#each g.items as r (r.id)}<li>{@render item(r)}</li>{/each}
			</ul>
		{:else}
			<p class="small muted">Nicio rețetă găsită.</p>
		{/each}
	</div>
{/if}

<style>
	.chips {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		padding: 2px 0;
		scrollbar-width: none;
	}
	.chip {
		flex-shrink: 0;
		height: 34px;
		padding: 0 12px;
		border-radius: 17px;
		border: 1px solid var(--line-strong);
		background: var(--card);
		font: 500 13px var(--sans);
		color: var(--ink);
		cursor: pointer;
	}
	.chip.on {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
	}
	.options {
		max-height: 420px;
		overflow-y: auto;
	}
	.group-title {
		position: sticky;
		top: 0;
		z-index: 1;
		background: var(--card);
		font-family: var(--serif);
		font-weight: 600;
		font-size: 15px;
		padding: 8px 0 4px;
	}
	.count {
		font-family: var(--sans);
		font-size: 12px;
		font-weight: 500;
		color: var(--muted);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
</style>
