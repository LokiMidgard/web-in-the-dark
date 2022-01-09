<script lang="ts">
    import type { Login, isAuthenticated } from "blade-common";
    import * as fido from "./fido";
    import Frame from "./../misc/frame.svelte";

    type availableAuthentication =
        | "password"
        | "webauthN-device"
        | "webauthN-key"
        | "github";
    import type common from "blade-common";
    import { onMount } from "svelte";
    import { readable } from "svelte/store";
    import { delay, sendServer } from "../misc/helper";
    import Loading from "../misc/loading.svelte";
    import App from "../main/App.svelte";
    import { flatStore } from "../misc/flatstore";
    import { GlobalData } from "../main/globalData";

    const globalData = flatStore(GlobalData.instance);

    let isWebauthPlatformAvailable = false;
    (async () =>
        (isWebauthPlatformAvailable = await fido.isPlatformSupported()))();

    let subtitle: string;
    $: subtitle = $globalData.isAuthenticated
        ? "Recrute new scundrels..."
        : "Be part of your new crew...";

    let invite: string | undefined;
    $: checkInvite(invite);
    invite = location.hash?.substring(1);

    let inviter: string | undefined;
    let validUntill: Date | undefined;

    async function checkInvite(i: string | undefined) {
        if (i) {
            error = undefined;
            const data = await sendServer("/auth/invite/validate->post", {
                invite: i,
            });

            if (data.successs) {
                validUntill = new Date(Date.parse(data.validUntill));
                inviter = data.granted_by;
            } else if (data.status == 404) {
                validUntill = undefined;
                invite = undefined;
                error =
                    data.status == 404
                        ? "Invite not valid, maybe expired"
                        : data.toString();
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
    let comment: string | undefined;

    let loginAvailable = true;
    $: checkLogin(login);
    let loding = false;
    let loginLoding = false;
    async function checkLogin(newLogin: string) {
        if (!newLogin) {
            loginAvailable = false;
            loginLoding = false;
        } else {
            loginLoding = true;

            await delay(1000);

            if (newLogin != login) return;

            const response = await sendServer(
                "/auth/password/check/:login->get",
                { login: newLogin }
            );

            if (response.successs) {
                loginAvailable = !response.found;
            } else {
                console.error(response);
                loginAvailable = false;
            }

            //this is not an an try finaly intentionaly
            loginLoding = false;
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
        const responst = await sendServer("/auth/invite->get", undefined);
        if (responst.successs) {
            inviteLink = responst.link;
            validUntill = new Date(Date.parse(responst.validUntill));
        } else {
            throw responst;
        }
    }

    async function RegisterWebAuthN(attachment: fido.attachment) {
        const registration = await sendServer(
            "/auth/webauth/challenge->get",
            undefined
        );
        if (registration.successs) {
            await fido.createCredential(
                registration.challenge,
                registration.id,
                attachment,
                invite,
                name,
                comment
            );
            window.location.assign("/");
        } else {
            console.error(registration);
        }
    }
</script>

<Frame {subtitle}>
    {#if error}
        <article class="warning">{error}</article>
    {/if}
    <article>
        {#if loding}
            <Loading />
        {:else if $globalData.isAuthenticated === true}
            {#if invite}
                <p>You are already loged in you can't accept this invite</p>
                <p><a href="/invite.html">Invite</a> someone else instead.</p>
            {:else}
                <p>
                    You can invite new scundreals by sending them an invite
                    link. This will allow them to generate a new account
                </p>
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
        {:else if $globalData.isAuthenticated === false && invite}
            <header>
                <p>You have been invited by {inviter}. Whats your name?</p>
                <input
                    aria-invalid={!name}
                    autocomplete="nickname"
                    bind:value={name}
                    placeholder="Your name..."
                />
            </header>
            <div class="grid">
                <aside>
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
                            disabled={!isWebauthPlatformAvailable}
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
                </aside>
                <div>
                    {#if selectedAuthentication == "password"}
                        <div>
                            <div>
                                <input
                                    aria-invalid={loginLoding
                                        ? undefined
                                        : !loginAvailable}
                                    data-tooltip="Tooltip"
                                    autocomplete="username"
                                    placeholder="Login"
                                    id="login"
                                    bind:value={login}
                                />
                                <small aria-busy={loginLoding}
                                    >{!login
                                        ? "Please select a login"
                                        : loginLoding
                                        ? "Checking name..."
                                        : loginAvailable
                                        ? ""
                                        : "Login already used"}</small
                                >
                                <input
                                    id="password"
                                    aria-invalid={!password}
                                    placeholder="Password"
                                    autocomplete="new-password"
                                    bind:value={password}
                                />
                            </div>
                            <button
                                disabled={loding ||
                                    !loginAvailable ||
                                    !name ||
                                    !password ||
                                    !login}
                                on:click={registerPassword}>Register</button
                            >
                        </div>

                        <p>
                            This is a hobby project. Do <strong class="realy"
                                >not</strong
                            > use this password anywhere else. It can't beguarantied
                            that it is stored securly!
                        </p>
                        {#if isWebauthPlatformAvailable}
                            <p>
                                Your device supports password less
                                authentication. You can choose it or any other
                                one on the left. This is recommended.
                            </p>
                        {:else}
                            <p>
                                If you have a securety Key like <em>fido</em> use
                                that instead.
                            </p>
                        {/if}
                    {:else if selectedAuthentication == "webauthN-device"}
                        <input
                            bind:value={comment}
                            placeholder="Name your device..."
                        />
                        <button
                            on:click={() => RegisterWebAuthN("platform")}
                            disabled={loding || !name || !comment}
                            >Register Using Device</button
                        >
                        <p>
                            You can only authenticate on <strong class="realy"
                                >this</strong
                            > device.
                        </p>
                        <p>
                            It is not <em>yet</em> supported to add multipple authentications.
                            So you can't use this account on another device
                        </p>
                    {:else if selectedAuthentication == "webauthN-key"}
                        <input
                            bind:value={comment}
                            placeholder="Name your key..."
                        />
                        <button
                            on:click={() => RegisterWebAuthN("cross-platform")}
                            disabled={loding || !name || !comment}
                            >Register Using Securety Key</button
                        >
                        <p>
                            You can only authenticate with <strong class="realy"
                                >this</strong
                            > securety key.
                        </p>
                        <p>
                            It is not <em>yet</em> supported to add multipple authentications.
                            So you can't use this account without this key.
                        </p>
                    {:else if selectedAuthentication == "github"}
                        <p>This is not yet supported</p>
                    {/if}
                </div>
            </div>
        {/if}
    </article>
</Frame>

<style lang="scss">
    .warning {
        border: var(--form-element-invalid-border-color) 1px solid;
    }
    article:empty {
        display: none;
    }
</style>
