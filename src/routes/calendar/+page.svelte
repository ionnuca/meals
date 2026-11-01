<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { addMonths, dayNumber, formatMonth, monthKey, MONTHS_SHORT, WEEKDAYS_SHORT } from '#lib/dates.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const planned = $derived(new Set(data.planned));
	const eventDays = $derived(new Set(data.events.map((e) => e.date)));
</script>

<svelte:head><title>Calendar · Mese</title></svelte:head>

<PageHeader title={formatMonth(data.month)} eyebrow="Calendar">
	{#snippet actions()}
		<a class="icon-btn" href={`/calendar?luna=${addMonths(data.month, -1)}`} aria-label="Luna anterioară"><Icon name="left" size={18} stroke={2} /></a>
		<a class="icon-btn" href={`/calendar?luna=${addMonths(data.month, 1)}`} aria-label="Luna următoare"><Icon name="right" size={18} stroke={2} /></a>
	{/snippet}
</PageHeader>

{#if data.month !== monthKey(data.today)}
	<a class="btn small secondary" href="/calendar" style="margin-bottom:12px">Luna curentă</a>
{/if}

<div class="cal" role="grid" aria-label={formatMonth(data.month)}>
	{#each WEEKDAYS_SHORT as w (w)}<span class="wd" role="columnheader">{w}</span>{/each}
	{#each data.cells as c, i (i)}
		{#if c}
			<a
				href={`/zi/${c}`}
				class="day"
				class:ev={eventDays.has(c)}
				class:today={c === data.today}
				role="gridcell"
				aria-label={`${dayNumber(c)}${eventDays.has(c) ? ', eveniment' : ''}${planned.has(c) ? ', planificat' : ''}`}
			>
				{dayNumber(c)}
				{#if planned.has(c)}<span class="dot"></span>{/if}
			</a>
		{:else}
			<span></span>
		{/if}
	{/each}
</div>

<div class="legend small muted">
	<span class="row"><span class="dot static"></span>zi planificată</span>
	<span class="row"><span class="sq"></span>eveniment</span>
</div>

<section class="stack">
	<div class="spread">
		<h2>Evenimente</h2>
		<a class="btn small" href="/evenimente/nou"><Icon name="plus" size={16} stroke={2.2} />Eveniment</a>
	</div>
	{#each data.events as e (e.id)}
		<a class="card ev-card" href={`/evenimente/${e.id}`}>
			<div class="date-box"><span class="d">{dayNumber(e.date)}</span><span class="m">{MONTHS_SHORT[Number(e.date.slice(5, 7)) - 1]}</span></div>
			<div class="grow">
				<h3>{e.name}</h3>
				<p class="small muted">{e.time ? `${e.time} · ` : ''}{e.guests} persoane · {e.itemCount} {e.itemCount === 1 ? 'fel' : 'feluri și băuturi'}</p>
			</div>
			<Icon name="right" size={18} stroke={2} />
		</a>
	{:else}
		<p class="empty">Niciun eveniment luna aceasta.</p>
	{/each}
</section>

<style>
	.cal {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		row-gap: 4px;
		text-align: center;
	}
	.wd {
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
		padding-bottom: 6px;
	}
	.day {
		height: 46px;
		margin: 0 auto;
		width: min(46px, 100%);
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		color: var(--ink);
		text-decoration: none;
		font-size: 15px;
		position: relative;
	}
	.day:hover {
		background: var(--ground);
		color: var(--ink);
	}
	.day.today {
		box-shadow: inset 0 0 0 2px var(--accent);
		font-weight: 600;
	}
	.day.ev {
		background: var(--event);
		color: #fff;
		font-weight: 600;
	}
	.dot {
		width: 5px;
		height: 5px;
		border-radius: 3px;
		background: var(--accent);
	}
	.day.ev .dot {
		background: #fff;
	}
	.legend {
		display: flex;
		gap: 16px;
		padding: 12px 4px 20px;
	}
	.legend .row {
		gap: 6px;
	}
	.sq {
		width: 10px;
		height: 10px;
		border-radius: 3px;
		background: var(--event);
	}
	.ev-card {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--ink);
		text-decoration: none;
		padding: 10px 12px;
	}
	.date-box {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		background: var(--event-soft);
		color: var(--event-ink);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.date-box .d {
		font-size: 17px;
		font-weight: 600;
		line-height: 1;
	}
	.date-box .m {
		font-size: 11px;
	}
</style>
