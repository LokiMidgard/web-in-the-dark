<script lang="ts">
    import type common from "blade-common";
    import { GlobalData } from "../main/globalData";
    import { flatStore } from "../misc/flatstore";
    import Frame from "../misc/frame.svelte";
    import { sendServer } from "../misc/helper";
    import * as fido from "./fido";
    let password: string | undefined;
    let login: string | undefined;

    const data = flatStore(GlobalData.instance);

    $: checkAuthentication($data.isAuthenticated);
    function checkAuthentication(isAuthenticated: boolean) {
        if (isAuthenticated) {
            window.location.assign("/");
        }
    }

    async function passwordLogin() {
        const data: common.Login = {
            login: login,
            password: password,
        };
        const response = await fetch("/auth/password/login", {
            method: "post",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (response.ok) {
            window.location.assign("/");
        }
        console.debug("Status patch", response.status);
    }

    async function webauthLogin() {
        const registration = await sendServer(
            "/auth/webauth/challenge->get",
            undefined
        );
        if (registration.successs) {
            await fido.getAssertion(registration.challenge);
            window.location.assign("/");
        } else {
            console.error(registration);
        }
    }
</script>

<Frame subtitle="Who are you?..">
    <article>
        {#if $data.isAuthenticated}
            <p>You are already authenticated</p>
            <p>You should be shortly redirected.</p>
        {:else}
            <header>
                <p>Choose your login method</p>
            </header>
            <details open>
                <summary> With Device / Key </summary>
                <button on:click={webauthLogin}>Login</button>
            </details>
            <details open>
                <summary> With Login Password </summary>
                <label for="login">Login</label>
                <input autocomplete="username" id="login" bind:value={login} />
                <label for="password">Password</label>
                <input
                    autocomplete="current-password"
                    id="password"
                    type="password"
                    bind:value={password}
                />
                <button disabled={!(login && password)} on:click={passwordLogin}
                    >login</button
                >
            </details>
        {/if}
    </article>
</Frame>
