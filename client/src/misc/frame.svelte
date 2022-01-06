<script lang="ts">
    import type { isAuthenticated } from "blade-common";

    import { onMount } from "svelte";
    import { GlobalData } from "../main/globalData";
    import { sendServer } from "./helper";
    import { flatStore } from "./flatstore";

    const data = flatStore(GlobalData.instance);

    function theme(t: "light" | "dark" | undefined) {
        console.log(t);
        if (t) document.querySelector("html").setAttribute("data-theme", t);
        else document.querySelector("html").removeAttribute("data-theme");
    }
</script>

<nav>
    <ul>
        <li>
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
        </li>
    </ul>
    <ul>
        <li>
            <hgroup>
                <h1>Web in the Dark</h1>
                <h2>The crews clocks...</h2>
            </hgroup>
        </li>
    </ul>
    <ul>
        <li><a href="/">Overview</a></li>
        {#if $data.name}
            <li><a href="/invite.html">Invete</a></li>
            <li><a href="/auth/logout">logout</a></li>
        {:else}
            <li><a href="/login.html">Login</a></li>
        {/if}
    </ul>
</nav>
<main class="container">
    <slot />
</main>

<style lang="scss">
    nav {
        // not sure why I nedd this...
        margin-left: var(--spacing);
        margin-right: var(--spacing);
    }
</style>
