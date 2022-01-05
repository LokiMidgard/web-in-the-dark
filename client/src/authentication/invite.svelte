<script lang="ts">
    import type { Login, CheckLogin, isAuthenticated } from "blade-common";
    import * as fido from "./fido";

    type availableAuthentication =
        | "password"
        | "webauthN-device"
        | "webauthN-key"
        | "github";
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
    $: checkInvite(invite);
    invite = location.hash?.substring(1);

    let inviter: string | undefined;
    let validUntill: Date | undefined;

    async function checkInvite(i: string | undefined) {
        if (i) {
            try {
                error = undefined;
                const data = await sendServer<
                    { invite: string },
                    { granted_by: string; validUntill: string }
                >("/auth/invite/validate", "post", { invite: i });

                validUntill = new Date(Date.parse(data.validUntill));
                inviter = data.granted_by;
            } catch (e) {
                validUntill = undefined;
                invite = undefined;
                error =
                    e.status == 404
                        ? "Invite not valid, maybe expired"
                        : e.toString();
            }
        } else {
            validUntill = undefined;
            invite = undefined;
        }
    }

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
    async function generateInvite() {
        const responst = await sendServer<
            void,
            { link: string; validUntill: string }
        >("/auth/invite", "get");

        inviteLink = responst.link;
        validUntill = new Date(Date.parse(responst.validUntill));
    }

    async function RegisterWebAuthN(attachment: fido.attachment) {
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
    {#if invite}
        <p>You are already loged in you can't accept this invite</p>
    {:else}
        <button on:click={generateInvite}>Generate Invite</button>
        {#if inviteLink}
            <div>
                <textarea readonly>{inviteLink}</textarea>
                <p>
                    This link is valid untill {validUntill.toLocaleString()}
                </p>
            </div>
        {/if}
    {/if}
{:else if isAuthenticated === false && invite && inviter}
    <p>You have been invited by {inviter}. Whats your name?</p>
    <input
        autocomplete="nickname"
        bind:value={name}
        placeholder="Your name..."
    />
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
            value={"webauthN-device"}
        />
        Device
    </label>
    <label>
        <input
            type="radio"
            bind:group={selectedAuthentication}
            value={"webauthN-key"}
        />
        Securety Key
    </label>

    <label>
        <input
            disabled
            type="radio"
            bind:group={selectedAuthentication}
            value={"github"}
        />
        Github
    </label>
    {#if selectedAuthentication == "password"}
        <div>
            <label for="login">Login</label>
            <input
                class:notAvailab={!loginAvailable}
                class:loading={loding}
                autocomplete="username"
                id="login"
                bind:value={login}
            />
            <label for="password">Password</label>
            <input
                id="password"
                autocomplete="new-password"
                bind:value={password}
            />
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
        </div>
    {:else if selectedAuthentication == "webauthN-device"}
        <button on:click={() => RegisterWebAuthN("platform")}
            >Register Using Device</button
        >
    {:else if selectedAuthentication == "webauthN-key"}
        <button on:click={() => RegisterWebAuthN("cross-platform")}
            >Register Using Securety Key</button
        >
    {:else if selectedAuthentication == "github"}
        <p>This is not yet supported</p>
    {/if}
{:else if !invite}
    <p>This is not a valid invite link, nor are you loged in...</p>
{:else if error}
    <p>{error}</p>
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
