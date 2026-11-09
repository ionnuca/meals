<script lang="ts">
	type Name =
		| 'plan' | 'calendar' | 'book' | 'cart' | 'left' | 'right' | 'plus' | 'minus' | 'check'
		| 'star' | 'person' | 'trash' | 'edit' | 'settings' | 'share' | 'camera' | 'clock'
		| 'bowl' | 'plate' | 'glass' | 'search' | 'logout' | 'copy' | 'close' | 'refresh';

	let { name, size = 20, stroke = 1.8 }: { name: Name; size?: number; stroke?: number } = $props();
</script>

<svg
	aria-hidden="true"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={stroke}
	stroke-linecap="round"
	stroke-linejoin="round"
>
	{#if name === 'plan'}<path d="M4 6h16M4 12h16M4 18h10" />
	{:else if name === 'calendar'}<rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" />
	{:else if name === 'book'}<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" /><path d="M5 17a3 3 0 0 1 3-3h11" />
	{:else if name === 'cart'}<path d="M4 5h2l2 11h10l2-8H7" /><circle cx="10" cy="19.5" r="1.3" /><circle cx="17" cy="19.5" r="1.3" />
	{:else if name === 'left'}<path d="M15 6l-6 6 6 6" />
	{:else if name === 'right'}<path d="M9 6l6 6-6 6" />
	{:else if name === 'plus'}<path d="M12 5v14M5 12h14" />
	{:else if name === 'minus'}<path d="M5 12h14" />
	{:else if name === 'check'}<path d="M5 12l5 5 9-10" />
	{:else if name === 'star'}<path d="M12 3l2.5 5.2 5.5.8-4 4 1 5.6L12 16l-5 2.6 1-5.6-4-4 5.5-.8z" />
	{:else if name === 'person'}<circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" />
	{:else if name === 'trash'}<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
	{:else if name === 'edit'}<path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" />
	{:else if name === 'settings'}<circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2.1-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2.1 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2.1 1.2L10 21h4l.5-2.6a7 7 0 0 0 2.1-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" />
	{:else if name === 'share'}<path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
	{:else if name === 'camera'}<path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
	{:else if name === 'clock'}<circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" />
	{:else if name === 'bowl'}<path d="M3 11h18a9 9 0 0 1-18 0z" /><path d="M9 7c0-1.5 1-2 1-3.5M14 7c0-1.5 1-2 1-3.5" />
	{:else if name === 'plate'}<circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" />
	{:else if name === 'glass'}<path d="M7 3h10l-1 9a4 4 0 0 1-8 0L7 3z" /><path d="M12 16v5M8.5 21h7" />
	{:else if name === 'search'}<circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" />
	{:else if name === 'logout'}<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10" />
	{:else if name === 'copy'}<rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
	{:else if name === 'close'}<path d="M6 6l12 12M18 6L6 18" />
	{:else if name === 'refresh'}<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.5 4.5v3.8h-3.8" />
	{/if}
</svg>
