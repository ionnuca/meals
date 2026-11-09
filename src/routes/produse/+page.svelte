<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import UnitSelect from '#lib/components/UnitSelect.svelte';
	import { AISLES } from '#lib/constants.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let q = $state('');
	let aisleFilter = $state('');
	let editing = $state<number | null>(null);
	let adding = $state(false);
	let newName = $state('');
	let newAisle = $state('Legume și fructe');
	let newUnit = $state('buc');
	let editName = $state('');
	let editAisle = $state('');
	let editUnit = $state('');

	const fold = (s: string) => s.toLocaleLowerCase('ro-RO').normalize('NFD').replace(/[̀-ͯ]/g, '');
	const filtered = $derived(
		data.products.filter((p) => (!aisleFilter || p.aisle === aisleFilter) && (!q.trim() || fold(p.name).includes(fold(q.trim()))))
	);
	const groups = $derived(
		[...new Set([...(AISLES as readonly string[]), ...filtered.map((p) => p.aisle)])]
			.map((aisle) => ({ aisle, items: filtered.filter((p) => p.aisle === aisle) }))
			.filter((g) => g.items.length)
	);

	function startEdit(p: { id: number; name: string; aisle: string; unit: string }) {
		editing = p.id;
		editName = p.name;
		editAisle = p.aisle;
		editUnit = p.unit;
	}
</script>

<svelte:head><title>Produse · Mese</title></svelte:head>

<PageHeader title="Produse" eyebrow={`${data.products.length} în catalog`} back="/retete">
	{#snippet actions()}
		<button class="btn small" onclick={() => (adding = !adding)} aria-expanded={adding}><Icon name="plus" size={16} stroke={2.2} />Produs</button>
	{/snippet}
</PageHeader>

<p class="small muted intro">Produsele din care se aleg ingredientele rețetelor și produsele din lista de cumpărături. Raionul hotărăște unde apare produsul în listă, iar unitatea e cea propusă implicit.</p>

{#if adding}
	<form
		method="POST"
		action="?/create"
		class="card stack add"
		use:enhance={() =>
			async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') {
					newName = '';
				}
			}}
	>
		<h2>Produs nou</h2>
		{#if form?.createError}<p class="form-error" role="alert">{form.createError}</p>{/if}
		{#if form?.created}<p class="form-ok" role="status">„{form.created}” a fost adăugat.</p>{/if}
		<label class="field">Nume<input type="text" name="name" required maxlength="120" bind:value={newName} placeholder="de ex. Quinoa" /></label>
		<div class="grid2">
			<label class="field">Raion
				<select name="aisle" bind:value={newAisle}>
					{#each AISLES as a (a)}<option value={a}>{a}</option>{/each}
				</select>
			</label>
			<label class="field">Unitate implicită<UnitSelect name="unit" label="Unitate implicită" bind:value={newUnit} /></label>
		</div>
		<div class="row">
			<button class="btn grow">Adaugă în catalog</button>
			<button type="button" class="btn secondary" onclick={() => (adding = false)}>Gata</button>
		</div>
	</form>
{/if}

<div class="search">
	<Icon name="search" size={18} />
	<input type="search" placeholder="Caută un produs" aria-label="Caută un produs" bind:value={q} />
</div>

<div class="chips" aria-label="Raioane">
	<button class="chip" class:on={!aisleFilter} onclick={() => (aisleFilter = '')}>Toate</button>
	{#each AISLES as a (a)}
		<button class="chip" class:on={aisleFilter === a} onclick={() => (aisleFilter = aisleFilter === a ? '' : a)}>{a}</button>
	{/each}
</div>

{#if form?.rowError && !form?.rowId}<p class="form-error">{form.rowError}</p>{/if}

{#each groups as g (g.aisle)}
	<section class="group">
		<h2>{g.aisle} <span class="count">{g.items.length}</span></h2>
		<ul>
			{#each g.items as p (p.id)}
				<li class:editing={editing === p.id}>
					{#if editing === p.id}
						<form
							method="POST"
							action="?/update"
							class="edit"
							use:enhance={() =>
								async ({ result, update }) => {
									await update({ reset: false });
									if (result.type === 'success') editing = null;
								}}
						>
							<input type="hidden" name="id" value={p.id} />
							<label class="field">Nume<input type="text" name="name" required maxlength="120" bind:value={editName} /></label>
							<div class="grid2">
								<label class="field">Raion
									<select name="aisle" bind:value={editAisle}>
										{#each AISLES as a (a)}<option value={a}>{a}</option>{/each}
									</select>
								</label>
								<label class="field">Unitate<UnitSelect name="unit" label="Unitate" bind:value={editUnit} /></label>
							</div>
							{#if form?.rowError && form?.rowId === p.id}<p class="form-error" role="alert">{form.rowError}</p>{/if}
							{#if p.usage}<p class="small muted">Folosit în {p.usage} {p.usage === 1 ? 'rețetă' : 'rețete'}; numele și raionul se schimbă și acolo.</p>{/if}
							<div class="row">
								<button class="btn small grow">Salvează</button>
								<button type="button" class="btn small secondary" onclick={() => (editing = null)}>Renunță</button>
							</div>
						</form>
						<form
							method="POST"
							action="?/delete"
							use:enhance={({ cancel }) => {
								if (!confirm(`Ștergi „${p.name}” din catalog?`)) cancel();
								return async ({ result, update }) => {
									await update();
									if (result.type === 'success') editing = null;
								};
							}}
						>
							<input type="hidden" name="id" value={p.id} />
							<button class="btn small danger block" disabled={p.usage > 0} title={p.usage ? 'Produsul e folosit în rețete' : undefined}>
								<Icon name="trash" size={16} />{p.usage ? 'Folosit în rețete — nu poate fi șters' : 'Șterge produsul'}
							</button>
						</form>
					{:else}
						<button class="item" onclick={() => startEdit(p)} aria-label={`Editează ${p.name}`}>
							<span class="grow name">{p.name}</span>
							{#if p.usage}<span class="usage">{p.usage} {p.usage === 1 ? 'rețetă' : 'rețete'}</span>{/if}
							<span class="unit">{p.unit}</span>
							<Icon name="edit" size={16} />
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{:else}
	<p class="empty">Niciun produs găsit.</p>
{/each}

<style>
	.intro {
		margin-bottom: 14px;
	}
	.add {
		margin-bottom: 16px;
	}
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
	.group {
		margin-top: 12px;
	}
	.count {
		font-family: var(--sans);
		font-size: 13px;
		font-weight: 500;
		color: var(--muted);
	}
	ul {
		list-style: none;
		margin: 6px 0 0;
		padding: 0;
	}
	li {
		border-bottom: 1px solid #f0ece3;
	}
	li.editing {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 12px;
		margin: 6px 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 46px;
		border: none;
		background: transparent;
		text-align: left;
		font: inherit;
		color: var(--ink);
		cursor: pointer;
		padding: 0 2px;
	}
	.item :global(svg) {
		color: var(--muted);
	}
	.unit,
	.usage {
		font-size: 12px;
		color: var(--muted);
		white-space: nowrap;
	}
	.usage {
		background: var(--accent-soft);
		color: var(--accent-dark);
		border-radius: 10px;
		padding: 2px 8px;
	}
	.edit {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.grid2 {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}
</style>
