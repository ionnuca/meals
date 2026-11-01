<script lang="ts">
	import Icon from './Icon.svelte';

	let {
		value = $bindable(1),
		min = 1,
		max = 99,
		name = undefined,
		label = 'porții',
		onchange = undefined,
		inverted = false
	}: {
		value?: number;
		min?: number;
		max?: number;
		name?: string;
		label?: string;
		onchange?: (v: number) => void;
		inverted?: boolean;
	} = $props();

	function set(v: number) {
		const next = Math.max(min, Math.min(max, v));
		if (next !== value) {
			value = next;
			onchange?.(next);
		}
	}
</script>

<div class="stepper" class:inverted>
	<button type="button" aria-label={`Mai puține ${label}`} onclick={() => set(value - 1)} disabled={value <= min}>
		<Icon name="minus" size={18} stroke={2.4} />
	</button>
	<output aria-live="polite">{value}</output>
	<button type="button" aria-label={`Mai multe ${label}`} onclick={() => set(value + 1)} disabled={value >= max}>
		<Icon name="plus" size={18} stroke={2.4} />
	</button>
	{#if name}<input type="hidden" {name} {value} />{/if}
</div>

<style>
	.stepper {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	button {
		width: 44px;
		height: 44px;
		border-radius: 22px;
		border: 1px solid var(--line-strong);
		background: var(--card);
		color: var(--accent-dark);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
	}
	button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	output {
		min-width: 32px;
		text-align: center;
		font-size: 20px;
		font-weight: 600;
	}
	.inverted button {
		border-color: transparent;
	}
</style>
