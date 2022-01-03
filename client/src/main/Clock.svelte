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
        console.debug("Status patch",response.status);
    }

    export async function deleteClock(clock: ClockInstance): Promise<void> {
        const response = await fetch("/clock", {
            method: "DELETE",
            body: JSON.stringify(clock),
            headers: {
                "Content-Type": "application/json",
            },
        });
        console.debug("status delete",response.status);
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
        console.debug("Status PUT",response.status);
        const id = await response.text();
        return parseInt(id);
    }
</script>

<script lang="ts">
    export let clock: ClockInstance;
    export let editable: boolean = false;

    let name = clock.name;
    let nameHasChanges: boolean;
    $: nameHasChanges = name != clock.name;

    function updateText() {
        if (clock.name != name) {
            clock.name = name;
            updateClock(clock);
        }
    }

    function segments(clock: number): number[] {
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
        clock.segments = Math.max(2, clock.segments + change);
        clock.value = Math.max(0, Math.min(clock.segments, clock.value));

        if (oldSegment != clock.segments || oldValue != clock.value) {
            updateClock(clock);
        }
    }
</script>

<div class="border">
    {#if editable}
        <button on:click={() => deleteClock(clock)}>Delete</button>
    {/if}
    <div class="clock">
        <div
            class="pie"
            style="--value: {clock.value}; --clock: {clock.segments}"
        />
        {#each segments(clock.segments) as s}
            <div
                class="marking"
                style="--value: {s}; --clock: {clock.segments}"
            />
        {/each}
    </div>

    {#if editable}
        <input type="text" bind:value={name} />
        {#if nameHasChanges}
            <button on:click={updateText}>Update Text</button>
        {/if}
    {:else}
        <h1>{clock.name}</h1>
    {/if}

    {#if editable}
        <h2>Value</h2>
        <div>
            <button on:click={() => change(1)}>+</button>
            <button on:click={() => change(-1)}>-</button>
        </div>
        <h2>Segments</h2>
        <div>
            <button on:click={() => changeSegments(1)}>+</button>
            <button on:click={() => changeSegments(-1)}>-</button>
        </div>
    {/if}
</div>

<style>
    h1 {
        font-size: 1.4em;
    }
    .border {
        border: 1px solid black;
        width: min-content;
        padding: 8px;
        height: min-content;
        margin: 12px;
    }
    .marking {
        content: "";
        position: absolute;
        width: 4px;
        height: calc(50% + 2px);
        background: #859787;
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
        border: 7px solid #282828;
        box-shadow: -4px -4px 10px rgba(67, 67, 67, 0.5),
            inset 4px 4px 10px rgba(0, 0, 0, 0.5),
            inset -4px -4px 10px rgba(67, 67, 67, 0.5),
            4px 4px 10px rgba(0, 0, 0, 0.3);
        border-radius: 50%;
        position: relative;
        padding: 2rem;
    }

    .pie {
        position: absolute;
        top: 0px;
        left: 0px;
        width: 100%;
        height: 100%;
        background-image: conic-gradient(
            red calc((360deg / var(--clock)) * var(--value)),
            white 0%,
            white
        );
        border-radius: 50%;
    }
</style>
