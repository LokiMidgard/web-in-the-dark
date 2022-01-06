<script lang="ts" context="module">
    import { Dictionary, dictionary } from "./helper";

    export interface ClockInstance {
        name: string;
        value: number;
        segments: number;
        id: number;
    }

    export async function getCloks(): Promise<Dictionary<ClockInstance>> {
        const response = await fetch("/clock", { method: "GET" });
        if (response.status == 200) {
            const data: ClockInstance[] = await response.json();
            const dic = dictionary(
                data,
                (x) => x.id.toString(),
                (x) => x
            );
            return dic;
        } else throw await response.text();
    }
    export async function updateClock(clock: ClockInstance): Promise<void> {
        const response = await fetch("/clock", {
            method: "PATCH",
            body: JSON.stringify(clock),
            headers: {
                "Content-Type": "application/json",
            },
        });
        console.debug("Status patch", response.status);
    }

    export async function deleteClock(clock: ClockInstance): Promise<void> {
        const response = await fetch("/clock", {
            method: "DELETE",
            body: JSON.stringify(clock),
            headers: {
                "Content-Type": "application/json",
            },
        });
        console.debug("status delete", response.status);
    }

    export async function createClock(
        clock: Omit<ClockInstance, "id">
    ): Promise<number> {
        const response = await fetch("/clock", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(clock),
        });
        console.debug("Status PUT", response.status);
        const id = await response.text();
        return parseInt(id);
    }
</script>

<script lang="ts">
    export let clock: ClockInstance;
    export let editable: boolean = false;

    // changes that need confirmation
    let name = clock.name;
    let nameHasChanges: boolean;
    $: nameHasChanges = name != clock.name;

    let segments = clock.segments;
    let segmentsHasChanges: boolean;
    $: segmentsHasChanges = segments != clock.segments;

    let shouldDelete = false;

    let hasChanges:boolean;
    $: hasChanges = shouldDelete|| nameHasChanges|| segmentsHasChanges;

    function cancel() {
        shouldDelete = false;
        segments = clock.segments;
        name = clock.name;
        isOpen=false;
    }
    async function save() {
        if (shouldDelete) {
            await deleteClock(clock);
        } else if (!nameHasChanges && !segmentsHasChanges) {
            return;
        } else {
            clock.segments = Math.max(2, segments);
            clock.value = Math.max(0, Math.min(clock.segments, clock.value));

            clock.name = name;

            await updateClock(clock);
        }
    }

    function updateText() {
        if (clock.name != name) {
            clock.name = name;
            updateClock(clock);
        }
    }

    function iterateSegments(clock: number): number[] {
        const result: number[] = [];
        for (let index = 0; index < clock; index++) {
            result.push(index);
        }
        return result;
    }
    function change(change: number) {
        const old = clock.value;
        clock.value = Math.max(
            0,
            Math.min(clock.segments, clock.value + change)
        );
        if (old != clock.value) {
            updateClock(clock);
        }
    }

    function changeSegments(change: number) {
        const oldSegment = clock.segments;
        const oldValue = clock.value;
        segments = Math.max(2, segments + change);
        // clock.value = Math.max(0, Math.min(clock.segments, clock.value));
    }

    let isOpen = false;
    function toggle() {
        isOpen = !isOpen;
    }
</script>

<article>
    <header>
        <div class="clock">
            <div
                class="pie"
                style="--value: {clock.value}; --clock: {segments}"
            />
            {#each iterateSegments(segments) as s}
                <div
                    class="marking"
                    style="--value: {s}; --clock: {segments}"
                />
            {/each}
        </div>
        {#if editable}
            <div class="grid">
                <a href="#non" on:click={() => change(1)}>+</a>
                <a href="#non" on:click={() => change(-1)}>-</a>
            </div>
        {/if}
    </header>
    <h6>{clock.name}</h6>

    {#if editable}
        <a  href="#non"  on:click={toggle}>Edit</a>
        <dialog open={isOpen}>
            <article style="min-width: 40rem;">
                <textarea bind:value={name} />

                <h6>Segments {segments}</h6>
                <div class="grid">
                    <button on:click={() => changeSegments(1)}>+</button>
                    <button on:click={() => changeSegments(-1)}>-</button>
                </div>
                <button
                    class:outline={!shouldDelete}
                    class="contrast"
                    on:click={() => (shouldDelete = !shouldDelete)}
                    >Delete</button
                >
                <footer>
                    <button
                        class="secondary"
                        on:click={cancel}
                    >
                        cancel
                    </button>

                    <button
                        on:click={save}
                        disabled={!hasChanges}
                    >
                        Confirm
                    </button>
                </footer>
            </article>
        </dialog>
    {/if}
</article>

<style lang="scss">
    :global(:not(dialog)) > article {
        width: 15rem;
        margin: 1rem;
        padding-bottom: 1rem;
        > header {
            margin-bottom: 1rem;
        }
    }

    .marking {
        content: "";
        position: absolute;
        width: 4px;
        height: calc(50% + 2px);
        background: var(--secondary);
        z-index: 0;
        left: calc(50% - 2px);
        top: calc(50% - 2px);
        transform-origin: 2px 2px;
        transform: rotate(
            calc(180deg + (360deg / var(--clock) * var(--value)))
        );
    }

    .clock {
        width: 7rem;
        height: 7rem;
        border: 7px solid var(--secondary);

        border-radius: 50%;
        position: relative;
        padding: 2rem;
        margin-left: auto;
        margin-right: auto;
        margin-top: 0px;
        + div {
            > a {
                text-align: center;
            }
            width: 7rem;
            margin-left: auto;
            margin-right: auto;
        }
    }

    .pie {
        position: absolute;
        top: 0px;
        left: 0px;
        width: 100%;
        height: 100%;
        background-image: conic-gradient(
            var(--primary) calc((360deg / var(--clock)) * var(--value)),
            var(--contrast) 0%,
            var(--contrast)
        );
        border-radius: 50%;
    }
</style>
