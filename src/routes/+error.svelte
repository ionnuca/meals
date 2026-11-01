<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="err">
	<p class="eyebrow">Eroare {page.status}</p>
	<h1>{page.status === 404 ? 'Pagina nu există' : 'Ceva n-a mers bine'}</h1>
	<p class="muted">{page.error?.message}</p>
	<a class="btn" href="/plan">Înapoi la plan</a>
</div>

<style>
	.err {
		padding-top: 60px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: flex-start;
	}
</style>
