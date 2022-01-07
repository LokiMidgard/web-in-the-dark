<script lang="ts">
	import Frame from "../misc/frame.svelte";

	import ClocksGrid from "../clocks/ClocksGrid.svelte";

	let subtitle: string;
	$: subtitle = "Your crews clocks...";
</script>

<Frame {subtitle}>
	<ClocksGrid />
</Frame>

<style>
</style>
