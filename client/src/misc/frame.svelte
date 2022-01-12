<script lang="ts">
    import type { isAuthenticated } from "blade-common";

    import { onMount } from "svelte";
    import { GlobalData } from "../main/globalData";
    import { sendServer } from "./helper";
    import { flatStore } from "./flatstore";

    const data = flatStore(GlobalData.instance);
    export let subtitle: string;

    export let wide: boolean = false;

    function theme(t: "light" | "dark" | undefined) {
        console.log(t);
        if (t) document.querySelector("html").setAttribute("data-theme", t);
        else document.querySelector("html").removeAttribute("data-theme");
    }

    async function logout() {
        await sendServer("/auth/logout->post", undefined);
        await $data.updateState();
    }
    let groupName: string | undefined;
    async function createGroup() {
        const promise = sendServer("/groups->put", { name: groupName });
        groupName = undefined;
        await promise;
        await $data.updateState();
    }
</script>

<nav>
    <ul>
        {#if $data.isAuthenticated}
            <li>
                {#if $data.groups.length > 0}
                    <select>
                        {#if $data.groups.some((x) => x.gm.id == $data.id)}
                            <optgroup label="as GM">
                                {#each $data.groups
                                    .filter((x) => x.gm.id == $data.id)
                                    .sort() as group}
                                    <option value={group.id}>
                                        {group.name}
                                    </option>
                                {/each}
                            </optgroup>
                        {/if}
                        {#if $data.groups.some((x) => x.gm.id != $data.id)}
                            <optgroup label="as Player">
                                {#each $data.groups
                                    .filter((x) => x.gm.id != $data.id)
                                    .sort() as group}
                                    <option value={group.id}>
                                        {group.name}
                                    </option>
                                {/each}
                            </optgroup>
                        {/if}
                    </select>
                {:else}
                    <a class="outline" role="button" href="">Create a Group</a>
                {/if}
            </li>
            <li>
                <div class="grid">
                    <input type="text" bind:value={groupName} />
                    <button disabled={!groupName} on:click={createGroup}
                        >Create Group</button
                    >
                </div>
            </li>
        {/if}
        <!-- <li>
            <a
                href="#non"
                on:click={() => theme(undefined)}
                class="contrast"
                data-theme-switcher="auto"><small>Auto</small></a
            >
        </li>
        <li>
            <a href="#non" on:click={() => theme("light")} class="contrast"
                ><small>Light</small></a
            >
        </li>
        <li>
            <a
                href="#non"
                on:click={() => theme("dark")}
                class="contrast"
                data-theme-switcher="dark"><small>Dark</small></a
            >
        </li> -->
    </ul>
    <ul>
        <li>
            <hgroup>
                <h1>Web in the Dark</h1>
                <h2>{subtitle}</h2>
            </hgroup>
        </li>
    </ul>
    <ul>
        <li><a href="/">Overview</a></li>
        {#if $data.name}
            <li><a href="/invite.html">Invete</a></li>
            <li><a href="/" on:click={logout}>logout</a></li>
        {:else}
            <li><a href="/login.html">Login</a></li>
        {/if}
    </ul>
</nav>
<main class:container={!wide}>
    <slot />
</main>

<style lang="scss">
    nav {
        // not sure why I nedd this...
        margin-left: var(--spacing);
        margin-right: var(--spacing);
    }
</style>
