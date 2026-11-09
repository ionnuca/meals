<script lang="ts">
	// Unitatea de măsură, aleasă dintr-o listă fixă (o valoare veche, din afara listei, rămâne disponibilă).
	import { UNITS } from '../constants';

	let {
		value = $bindable(''),
		name = undefined,
		label,
		allowEmpty = false
	}: { value?: string; name?: string; label: string; allowEmpty?: boolean } = $props();

	const known = UNITS as readonly string[];
</script>

<select {name} aria-label={label} bind:value>
	{#if allowEmpty}<option value="">—</option>{/if}
	{#each known as u (u)}<option value={u}>{u}</option>{/each}
	{#if value && !known.includes(value)}<option {value}>{value}</option>{/if}
</select>
