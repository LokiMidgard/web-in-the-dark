<script lang="ts">
    import type { Login, CheckLogin, isAuthenticated } from "blade-common";
    import * as fido from "./fido";

    type availableAuthentication = "password" | "WebauthN" | "github";
    import type common from "blade-common";
    import { onMount } from "svelte";
    import { readable } from "svelte/store";
    import { delay, sendServer } from "../main/helper";
    import Loading from "../misc/loading.svelte";

    let isAuthenticated: boolean | undefined;

    var enc = new TextEncoder(); // always utf-8
    var dec = new TextDecoder(); // always utf-8

    onMount(async () => {
        const result = await sendServer<void, isAuthenticated>(
            "/auth/isAuthenticated",
            "get"
        );
        isAuthenticated = result.isAuthenticated;
    });
    let invite: string | undefined;
    invite = location.hash?.substring(1);
    window.onhashchange = function () {
        invite = location.hash?.substring(1);
    };
    let selectedAuthentication: availableAuthentication = "password";
    let name: string | undefined;
    let password: string | undefined;
    let login: string | undefined;

    let loginAvailable = true;
    $: checkLogin(login);
    let loding = false;
    async function checkLogin(newLogin: string) {
        if (!newLogin) {
            loginAvailable = false;
            loding = false;
        } else {
            loding = true;
            const data: CheckLogin = {
                login: newLogin,
            };

            await delay(1000);

            if (data.login != login) return;

            const result = await fetch("/auth/password/check", {
                method: "post",
                body: JSON.stringify(data),
                headers: {
                    "Content-Type": "application/json",
                },
            });

            loginAvailable = result.status == 404;
            loding = false;
        }
    }
    let error: string | undefined;
    async function registerPassword() {
        error = undefined;
        const data: common.RegsiterAccount<Login> = {
            name: name,
            invite: window.location.hash.substring(1),
            authentication: {
                login: login,
                password: password,
            },
        };
        const response = await fetch("/auth/password/register", {
            method: "post",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json",
            },
        });
        console.debug("Status patch", response.status);
        if (response.ok) {
            window.location.assign("/");
        } else {
            error = await response.text();
        }
    }
    let inviteLink: string | undefined;
    let validUntill: string | undefined;
    async function generateInvite() {
        const responst = await sendServer<
            void,
            { link: string; validUntill: string }
        >("/api/invite", "get");

        inviteLink = responst.link;
        validUntill = responst.validUntill;
    }

    async function RegisterWebAuthN() {
        try {
            const registration = await sendServer<
                void,
                { challenge: string; id: string }
            >("/auth/webauth/challenge", "get");

            fido.createCredential(
                registration.challenge,
                registration.id,
                "platform",
                invite,
                name
            );
            window.location.assign("/");
        } catch (error) {
            console.error(error);
        }
    }
</script>

{#if error}
    <p class="warn">{error}</p>
{/if}

{#if isAuthenticated === true}
    <button on:click={generateInvite}>Generate Invite</button>
    {#if inviteLink}
        <div>
            <textarea readonly>{inviteLink}</textarea>
            <p>
                This link is valid untill {new Date(
                    Date.parse(validUntill)
                ).toLocaleString()}
            </p>
        </div>
    {/if}
{:else if isAuthenticated === false}
    {#if invite}
        <p>You have been invited. Whats your name?</p>
        <input bind:value={name} placeholder="Your name..." />
        <p>Choose a authentication method.</p>
        <label>
            <input
                type="radio"
                bind:group={selectedAuthentication}
                value={"password"}
            />
            Username & Password
        </label>

        <label>
            <input
                type="radio"
                bind:group={selectedAuthentication}
                value={"WebauthN"}
            />
            Browser
        </label>

        <label>
            <input
                type="radio"
                bind:group={selectedAuthentication}
                value={"github"}
            />
            Github
        </label>
        {#if selectedAuthentication == "password"}
            <form>
                <label for="login">Login</label>
                <input
                    class:notAvailab={!loginAvailable}
                    class:loading={loding}
                    id="login"
                    bind:value={login}
                />
                <label for="password">Password</label>
                <input id="password" bind:value={password} />
                <button
                    disabled={loding ||
                        !loginAvailable ||
                        !name ||
                        !password ||
                        !login}
                    on:click={registerPassword}>Register</button
                >
                {#if loding}
                    <Loading lable="Checking name" />
                {/if}
            </form>
        {:else if selectedAuthentication == "WebauthN"}
            <p>This is not yet supported</p>
            <button on:click={RegisterWebAuthN}>Register Using Device</button>
        {:else if selectedAuthentication == "github"}
            <p>This is not yet supported</p>
        {/if}
    {:else}
        <p>This was not a valid invite link</p>
    {/if}
{:else}
    <Loading />
{/if}

<style lang="scss">
    .warn {
        border: 2px red solid;
    }
    .notAvailab {
        border: 1px red solid;
        background-color: lightcoral;
    }
    input.loading {
        background-color: lightgoldenrodyellow;
    }
</style>
