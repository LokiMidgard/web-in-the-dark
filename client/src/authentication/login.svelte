<script lang="ts">
    import type common from "blade-common";
    import { sendServer } from "../main/helper";
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

<div>
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
</div>

<button on:click={webauthLogin}>Login With Device</button>
