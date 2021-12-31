<script lang="ts">
	import Clock, {
		ClockInstance,
		createClock,
		getCloks,
	} from "./Clock.svelte";
	import { itterate } from "./helper";
	import ioclient from "socket.io-client";
	const socket = ioclient();

	socket.on("update_clock", async (data: ClockInstance) => {
		const old = await clocksPromise;
		old[data.id.toString()] = data;
		clocksPromise = Promise.resolve(old);
	});

	export let name: string;


	function newClock() {
		createClock({
			name: "Test",
			segments: 4,
			value: 1,
		});
	}

	let clocksPromise = getCloks();
</script>

<main>
	<h1>Hello {name}!</h1>
	<p>
		Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn
		how to build Svelte apps.
	</p>

	<button on:click={newClock}>+</button>

	{#await clocksPromise}
		<p>loading...</p>
	{:then clocks}
		{#each itterate(clocks) as [key, clock]}
			<Clock {clock} />
		{/each}
	{:catch e}
		<p>{e}</p>
	{/await}
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
