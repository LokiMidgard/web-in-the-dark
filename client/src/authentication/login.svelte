<script lang="ts">
    import type common from "blade-common";
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
</script>

<form>
    <label for="login">Login</label>
    <input id="login" bind:value={login} />
    <label for="password">Password</label>
    <input id="password" type="password" bind:value={password} />
</form>
<button disabled={!(login && password)} on:click={passwordLogin}>login</button>
