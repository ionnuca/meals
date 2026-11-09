<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Photo from '#lib/components/Photo.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { MEAL_ORDER, mealTypeLabel } from '#lib/constants.ts';
	import { addDays, formatDayShort, formatRange, weekdayIndex, WEEKDAYS } from '#lib/dates.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const days = $derived(
		data.days.map((date) => {
			const meals = data.meals.filter((m) => m.date === date);
			// rândurile zilei: mesele existente plus mesele zilnice încă necompletate (doar de azi înainte)
			const present = new Set(meals.map((m) => m.mealType));
			const rows = [
				...meals.map((m) => ({ key: `m${m.id}`, order: MEAL_ORDER[m.mealType] ?? 9, label: m.label, text: m.dishes.map((x) => x.name).join(' · '), empty: !m.dishes.length })),
				...(date < data.today ? [] : data.dailyTypes)
					.filter((t) => !present.has(t))
					.map((t) => ({ key: `s${t}`, order: MEAL_ORDER[t] ?? 9, label: mealTypeLabel(t), text: '', empty: true }))
			].sort((a, b) => a.order - b.order);
			return {
				date,
				meals,
				rows,
				events: data.events.filter((e) => e.date === date),
				thumbs: meals.flatMap((m) => m.dishes).slice(0, 6)
			};
		})
	);
	const isEmpty = $derived(data.meals.length === 0 && data.events.length === 0);
	const thisWeek = $derived(data.days.includes(data.today));
	const weekPast = $derived(data.sunday < data.today);
</script>

<svelte:head><title>Plan · Mese</title></svelte:head>

<PageHeader title={formatRange(data.monday, data.sunday)} eyebrow="Planul săptămânii">
	{#snippet actions()}
		<a class="icon-btn" href={`/plan?s=${addDays(data.monday, -7)}`} aria-label="Săptămâna anterioară"><Icon name="left" size={18} stroke={2} /></a>
		<a class="icon-btn" href={`/plan?s=${addDays(data.monday, 7)}`} aria-label="Săptămâna următoare"><Icon name="right" size={18} stroke={2} /></a>
	{/snippet}
</PageHeader>

<div class="toolbar row">
	{#if !thisWeek}<a class="btn small secondary" href="/plan">Săptămâna curentă</a>{/if}
	<a class="btn small secondary" href={`/cumparaturi?de=${data.monday}&pana=${data.sunday}`}><Icon name="cart" size={16} />Lista săptămânii</a>
	<a class="icon-btn plain" href="/setari" aria-label="Setări" style="margin-left:auto"><Icon name="settings" size={20} /></a>
</div>

{#if isEmpty && !weekPast}
	<div class="empty stack">
		<p>Săptămâna aceasta nu are încă nimic planificat.</p>
		<form method="POST" action="?/copyPrevious" use:enhance>
			<input type="hidden" name="monday" value={data.monday} />
			<button class="btn secondary small"><Icon name="copy" size={16} />Copiază săptămâna trecută</button>
		</form>
	</div>
{/if}

<div class="stack days">
	{#each days as d (d.date)}
		<a class="card day" href={`/zi/${d.date}`} class:today={d.date === data.today} class:past={d.date < data.today}>
			<div class="spread">
				<h2>{WEEKDAYS[weekdayIndex(d.date)]}</h2>
				<span class="small muted">{d.date === data.today ? 'azi · ' : ''}{formatDayShort(d.date)}</span>
			</div>
			{#if d.thumbs.length}
				<div class="thumbs">
					{#each d.thumbs as t (t.id)}<Photo photo={t.photo} category={t.category} size={40} radius={10} alt={t.name} />{/each}
				</div>
			{/if}
			{#if d.rows.length}
				<dl class="meals">
					{#each d.rows as r (r.key)}
						<dt>{r.label}</dt>
						<dd class:todo={r.empty}>{r.empty ? '—' : r.text}</dd>
					{/each}
				</dl>
			{:else if !d.events.length}
				<p class="small muted">{d.date < data.today ? 'Nimic planificat' : 'Nimic planificat · atinge ca să adaugi'}</p>
			{/if}
			{#each d.events as e (e.id)}
				<div class="event">
					<Icon name="star" size={18} />
					<span><b>{e.name}</b> · {e.time ? `${e.time} · ` : ''}{e.guests} persoane · {e.itemCount} {e.itemCount === 1 ? 'fel' : 'feluri'}</span>
				</div>
			{/each}
		</a>
	{/each}
</div>

<style>
	.toolbar {
		margin-bottom: 14px;
		flex-wrap: wrap;
	}
	.empty {
		margin-bottom: 14px;
		align-items: center;
	}
	.day {
		display: flex;
		flex-direction: column;
		gap: 10px;
		color: var(--ink);
		text-decoration: none;
	}
	.day:hover {
		border-color: var(--line-strong);
		color: var(--ink);
	}
	.day.past {
		background: var(--ground);
		opacity: 0.8;
	}
	.day.today {
		border-color: var(--accent);
		box-shadow: 0 0 0 1px var(--accent);
	}
	.thumbs {
		display: flex;
		gap: 6px;
	}
	.meals {
		margin: 0;
		display: grid;
		grid-template-columns: 82px minmax(0, 1fr);
		row-gap: 5px;
		font-size: 14px;
	}
	.meals dt {
		color: var(--accent);
		font-weight: 500;
	}
	.meals dd {
		margin: 0;
	}
	.meals dd.todo {
		color: var(--muted);
	}
	.event {
		border-radius: 12px;
		background: var(--event-soft);
		color: var(--event-ink);
		padding: 10px 12px;
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 13px;
	}
	.event b {
		font-weight: 600;
	}
</style>
