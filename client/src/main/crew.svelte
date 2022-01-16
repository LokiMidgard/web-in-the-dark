<script lang="ts">
    import type { data } from "blade-common";

    import { flatStore } from "../misc/flatstore";
    import { sendServer } from "../misc/helper";
    import { GlobalData } from "./globalData";

    const globalData = flatStore(GlobalData.instance);
    let crew: data.Crew | undefined;

    async function name() {
        const result = await sendServer(
            "/groups/:groupId:number/crew->get",
            undefined
        );
        if (result.successs) {
            crew = result;
        } else {
            crew = undefined;
        }
    }
</script>

<main>
    <p>{crew.name}</p>
</main>
