<script lang="ts">
    import type common from "blade-common";
    import Frame from "../misc/frame.svelte";
    import { sendServer } from "../misc/helper";
    import * as fido from "./fido";
    let name: string | undefined;
    let password: string | undefined;
    let login: string | undefined;

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
        try {
            const registration = await sendServer<
                void,
                { challenge: string; id: string }
            >("/auth/webauth/challenge", "get");

            await fido.getAssertion(registration.challenge);
            window.location.assign("/");
        } catch (error) {
            console.error(error);
        }
    }
</script>

<Frame>
    <article>
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
    </article>
</Frame>
