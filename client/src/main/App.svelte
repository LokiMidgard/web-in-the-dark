<script lang="ts">
	import Frame from "../misc/frame.svelte";
import {data} from 'blade-common'
	import ClocksGrid from "../clocks/ClocksGrid.svelte";

	let subtitle: string;
	$: subtitle = "Your crews clocks...";
</script>
{data.bla}
<Frame {subtitle} wide>
	<ClocksGrid />
</Frame>

<style>
</style>
