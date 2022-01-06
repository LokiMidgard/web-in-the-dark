<script lang="ts">
	import Clock, {
		ClockInstance,
		createClock,
		getCloks,
	} from "../clocks/Clock.svelte";
	import { itterate, sendServer } from "../misc/helper";
	import ioclient from "socket.io-client";
	import { onMount } from "svelte";
	import type { isAuthenticated } from "blade-common";
import Frame from "../misc/frame.svelte";
import { flatStore } from "../misc/flatstore";
import { GlobalData } from "./../main/globalData";
	const socket = ioclient();

	const data = flatStore(GlobalData.instance);


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
	$: edit = $data.isAuthenticated ?? false;

	let clocksPromise = getCloks();
</script>



	
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

<style>
	 .clocks {
		display: flex;
		flex-wrap: wrap;
	}
	/*
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
	}  */
</style>
