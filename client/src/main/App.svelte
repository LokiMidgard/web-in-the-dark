<script lang="ts">
	import Clock, {
		ClockInstance,
		createClock,
		getCloks,
	} from "./Clock.svelte";
	import { itterate, sendServer } from "./helper";
	import ioclient from "socket.io-client";
	import { onMount } from "svelte";
	import type { isAuthenticated } from "blade-common";
	const socket = ioclient();

	let isAuthenticated: boolean | undefined;
	let userName: string | undefined;

	onMount(async () => {
		const result = await sendServer<void, isAuthenticated>(
			"/auth/isAuthenticated",
			"get"
		);
		isAuthenticated = result.isAuthenticated;
		userName = result.userName;
	});

	socket.on("update_clock", async (data: ClockInstance) => {
		console.debug("update clock", data);
		const old = await clocksPromise;
		old[data.id.toString()] = data;
		clocksPromise = Promise.resolve(old);
	});

	socket.on(
		"delete_clock",
		async (
			data: Omit<Omit<Omit<ClockInstance, "segments">, "name">, "value">
		) => {
			console.log("delete", data);
			const old = await clocksPromise;
			old[data.id.toString()] = undefined;
			clocksPromise = Promise.resolve(old);
		}
	);

	function newClock() {
		createClock({
			name: "Test",
			segments: 4,
			value: 1,
		});
	}

	let edit: boolean;
	$: edit = isAuthenticated;

	let clocksPromise = getCloks();
</script>

<main>
	<h1>Web in the Dark</h1>
	<p>The crews clocks...</p>
	{#if userName}
		<p>
			<a href="/invite.html">Invete</a> new scundrels. Or
			<a href="/auth/logout">logout</a>.
		</p>
	{:else}
		<p><a href="/login.html">Login</a> for more options.</p>
	{/if}
	{#if edit}
		<button on:click={newClock}>Add Clock</button>
	{/if}
	<div class="clocks">
		{#await clocksPromise}
			<p>loading...</p>
		{:then clocks}
			{#each itterate(clocks) as [key, clock]}
				<Clock {clock} editable={edit} />
			{/each}
		{:catch e}
			<p>{e}</p>
		{/await}
	</div>
</main>

<style>
	.clocks {
		display: flex;
		flex-wrap: wrap;
	}
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
