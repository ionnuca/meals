<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { SvelteSet } from 'svelte/reactivity';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { AISLES, UNITS } from '#lib/constants.ts';
	import { addDays, daysBetween, formatRange } from '#lib/dates.ts';
	import { toPlainText } from '#lib/shopping.ts';
	import { formatQuantity } from '#lib/units.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const checked = new SvelteSet<string>();
	$effect(() => {
		checked.clear();
		for (const k of data.checked) checked.add(k);
	});

	const all = $derived(data.groups.flatMap((g) => g.items));
	const done = $derived(all.filter((i) => checked.has(i.key)).length);
	let hideDone = $state(false);
	let showRange = $state(false);
	let showExtra = $state(false);
	let copied = $state('');

	const span = $derived(daysBetween(data.from, data.to) + 1);
	const prev = $derived(`/cumparaturi?de=${addDays(data.from, -span)}&pana=${addDays(data.to, -span)}`);
	const next = $derived(`/cumparaturi?de=${addDays(data.from, span)}&pana=${addDays(data.to, span)}`);

	let customFrom = $state('');
	let customTo = $state('');
	$effect(() => {
		customFrom = data.from;
		customTo = data.to;
	});

	async function share() {
		const text = toPlainText(`Cumpărături ${formatRange(data.from, data.to)}`, data.groups, checked);
		try {
			if (navigator.share) {
				await navigator.share({ title: 'Lista de cumpărături', text });
				return;
			}
			await navigator.clipboard.writeText(text);
			copied = 'Lista a fost copiată.';
		} catch {
			copied = '';
		}
	}
</script>

<svelte:head><title>Cumpărături · Mese</title></svelte:head>

<PageHeader title="Lista de cumpărături" eyebrow={`Din plan · ${formatRange(data.from, data.to)}`}>
	{#snippet actions()}
		<a class="icon-btn" href={prev} aria-label="Perioada anterioară"><Icon name="left" size={18} stroke={2} /></a>
		<a class="icon-btn" href={next} aria-label="Perioada următoare"><Icon name="right" size={18} stroke={2} /></a>
	{/snippet}
</PageHeader>

<div class="progress-row">
	<div class="bar"><div style={`width:${all.length ? (done / all.length) * 100 : 0}%`}></div></div>
	<span class="small muted">{done} din {all.length}</span>
</div>

<div class="toolbar">
	<button class="btn small secondary" onclick={share} disabled={!all.length}><Icon name="share" size={16} />Trimite</button>
	<button class="btn small secondary" onclick={() => (hideDone = !hideDone)} aria-pressed={hideDone}>{hideDone ? 'Arată bifatele' : 'Ascunde bifatele'}</button>
	<button class="btn small secondary" onclick={() => (showRange = !showRange)}><Icon name="calendar" size={16} />Perioada</button>
</div>
{#if copied}<p class="form-ok" role="status">{copied}</p>{/if}

{#if showRange}
	<form
		class="card range"
		onsubmit={(e) => {
			e.preventDefault();
			if (customFrom && customTo) goto(`/cumparaturi?de=${customFrom}&pana=${customTo}`);
		}}
	>
		<label class="field">De la<input type="date" bind:value={customFrom} required /></label>
		<label class="field">Până la<input type="date" bind:value={customTo} min={customFrom} required /></label>
		<button class="btn">Arată</button>
	</form>
{/if}

{#if all.length}
	<div class="groups">
		{#each data.groups as g (g.aisle)}
			{@const visible = hideDone ? g.items.filter((i) => !checked.has(i.key)) : g.items}
			{#if visible.length}
				<section>
					<h2>{g.aisle}</h2>
					<ul>
						{#each visible as item (item.key)}
							<li>
								<form
									method="POST"
									action="?/toggle"
									use:enhance={({ formData }) => {
										const now = formData.get('checked') === 'true';
										if (now) checked.add(item.key);
										else checked.delete(item.key);
										return async ({ result }) => {
											if (result.type !== 'success') {
												if (now) checked.delete(item.key);
												else checked.add(item.key);
											}
										};
									}}
								>
									<input type="hidden" name="period" value={data.period} />
									<input type="hidden" name="key" value={item.key} />
									<input type="hidden" name="checked" value={checked.has(item.key) ? 'false' : 'true'} />
									<button class="item" class:done={checked.has(item.key)} aria-pressed={checked.has(item.key)} title={item.sources.join('\n')}>
										<span class="box">{#if checked.has(item.key)}<Icon name="check" size={14} stroke={3} />{/if}</span>
										<span class="grow">
											<span class="name">{item.name}</span>
											<span class="src">{item.sources.slice(0, 2).join(' · ')}{item.sources.length > 2 ? ` · +${item.sources.length - 2}` : ''}</span>
										</span>
										<span class="q">{item.display}</span>
									</button>
								</form>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		{/each}
	</div>
	{#if done}
		<form method="POST" action="?/clearChecks" use:enhance style="margin-top:12px">
			<input type="hidden" name="period" value={data.period} />
			<button class="btn small secondary">Debifează tot</button>
		</form>
	{/if}
{:else}
	<div class="empty">
		Nu e nimic de cumpărat în această perioadă.<br />Planifică mese sau adaugă produse manual.
	</div>
{/if}

<section class="extras">
	{#if showExtra}
		<form method="POST" action="?/addExtra" class="card stack" use:enhance={() => async ({ update }) => update()}>
			<h2>Adaugă manual</h2>
			<input type="hidden" name="period" value={data.period} />
			<datalist id="units">{#each UNITS as u (u)}<option value={u}></option>{/each}</datalist>
			<label class="field">Produs<input type="text" name="name" required maxlength="120" placeholder="de ex. Pâine" /></label>
			<div class="grid3">
				<label class="field">Cantitate<input type="text" name="quantity" inputmode="decimal" /></label>
				<label class="field">Unitate<input type="text" name="unit" list="units" /></label>
				<label class="field">Raion
					<select name="aisle">
						{#each AISLES as a (a)}<option value={a}>{a}</option>{/each}
					</select>
				</label>
			</div>
			<div class="row">
				<button class="btn grow">Adaugă</button>
				<button type="button" class="btn secondary" onclick={() => (showExtra = false)}>Gata</button>
			</div>
		</form>
	{:else}
		<button class="btn dashed block" onclick={() => (showExtra = true)}><Icon name="plus" size={18} stroke={2} />Adaugă un produs</button>
	{/if}

	{#if data.extras.length}
		<h3 style="margin-top:16px">Adăugate manual</h3>
		<ul class="extra-list">
			{#each data.extras as e (e.id)}
				<li>
					<span class="grow">{e.name}</span>
					<span class="muted small">{formatQuantity(e.quantity, e.unit)}</span>
					<form method="POST" action="?/removeExtra" use:enhance>
						<input type="hidden" name="extra_id" value={e.id} />
						<button class="icon-btn plain" aria-label={`Șterge ${e.name}`}><Icon name="close" size={16} /></button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.progress-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.bar {
		flex: 1;
		height: 6px;
		border-radius: 3px;
		background: var(--line);
		overflow: hidden;
	}
	.bar div {
		height: 100%;
		background: var(--accent);
		transition: width 0.2s;
	}
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 14px 0;
	}
	.range {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		gap: 10px;
		align-items: end;
		margin-bottom: 14px;
	}
	.groups {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	ul {
		list-style: none;
		margin: 6px 0 0;
		padding: 0;
	}
	.item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 48px;
		padding: 6px 0;
		border: none;
		background: transparent;
		text-align: left;
		font: inherit;
		color: var(--ink);
		cursor: pointer;
		border-bottom: 1px solid #f0ece3;
	}
	.box {
		width: 24px;
		height: 24px;
		border-radius: 7px;
		border: 1.5px solid #8c9386;
		background: var(--card);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: #fff;
	}
	.item.done .box {
		background: var(--accent);
		border-color: var(--accent);
	}
	.name {
		display: block;
		font-size: 15px;
	}
	.item.done .name {
		color: var(--muted);
		text-decoration: line-through;
	}
	.src {
		display: block;
		font-size: 12px;
		color: var(--muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.q {
		font-size: 14px;
		color: var(--muted);
		white-space: nowrap;
	}
	.extras {
		margin-top: 24px;
	}
	.extra-list li {
		display: flex;
		align-items: center;
		gap: 10px;
		border-bottom: 1px solid #f0ece3;
	}
	.grid3 {
		display: grid;
		grid-template-columns: 80px 90px minmax(0, 1fr);
		gap: 10px;
	}
</style>
